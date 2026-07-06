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
  initPublicTheme();
  bindPublicEvents();
  loadPublicRooms();
  initBackToTop();
  initScrollAnimations();
});

// Gan cac su kien nguoi dung: tim kiem, loc, reset bo loc va gui form dang ky.
function bindPublicEvents() {
  const required = ["searchInput","buildingFilter","floorFilter","typeFilter","statusFilter","resetFiltersBtn","registerForm","publicThemeToggle"];
  required.forEach(id => {
    if (!document.getElementById(id)) console.warn("Missing element #" + id);
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("input", (event) => {
    publicState.filters.keyword = event.target.value;
    renderPublicRooms();
  });

  ["buildingFilter", "floorFilter", "typeFilter", "statusFilter", "amenityFilter"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", (event) => {
      const key = id.replace("Filter", "");
      publicState.filters[key] = event.target.value;
    renderPublicRooms();
    renderPriceGrid();
    });
  });

  const resetBtn = document.getElementById("resetFiltersBtn");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    publicState.filters = { keyword: "", building: "", floor: "", type: "", status: "", amenity: "" };
    const pf = document.getElementById("publicFilters");
    if (pf) pf.reset();
    renderPublicRooms();
    renderPriceGrid();
  });

  const regForm = document.getElementById("registerForm");
  if (regForm) regForm.addEventListener("submit", handleRegisterSubmit);

  // Theme toggle
  const themeBtn = document.getElementById("publicThemeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", togglePublicTheme);
  }
}

// Tai danh sach phong cho trang public, sau do do du lieu vao bo loc va render UI.
async function loadPublicRooms() {
  const list = document.getElementById("roomList");
  const map = document.getElementById("roomMap");
  // YÊU CẦU 2: Xử lý trạng thái loading (Skeleton) khi chờ API
  list.innerHTML = Array(6).fill(0).map(() => `<div class="col-12 col-md-6 col-xl-4"><div class="room-card"><div class="skeleton-box" style="height: 200px"></div><div class="card-body"><div class="skeleton-box w-75 mb-3"></div><div class="skeleton-box w-50 mb-2"></div><div class="skeleton-box w-100"></div></div></div></div>`).join("");
  map.innerHTML = `<div class="floor-grid">` + Array(8).fill(0).map(() => `<div class="skeleton-box" style="height: 110px; border-radius: 12px;"></div>`).join("") + `</div>`;

  try {
    publicState.rooms = await DormAPI.list("rooms");
    populateFilterOptions(publicState.rooms);
    renderPublicRooms();
    renderPriceGrid();
  } catch (error) {
    list.innerHTML = `<div class="col-12 empty-state">Không thể tải dữ liệu phòng. Hãy kiểm tra API_BASE_URL trong js/api.js.</div>`;
    map.innerHTML = `<div class="empty-state">Không thể tải sơ đồ phòng.</div>`;
    const grid = document.getElementById("priceGrid");
    if (grid) grid.innerHTML = `<div class="col-12 empty-state">Không thể tải bảng giá phòng.</div>`;
    showToast("Tải danh sách phòng thất bại: " + error.message, "error");
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

  initScrollAnimations();
}

// Render so do phong theo tang, moi tang la mot section rieng biet.
function renderRoomMap(rooms) {
  const map = document.getElementById("roomMap");
  if (!rooms.length) {
    map.innerHTML = `<div class="empty-state">Không có phòng phù hợp để hiển thị sơ đồ.</div>`;
    renderMapFilterTabs([]);
    return;
  }

  // Group theo tang
  const floorGroups = {};
  rooms.forEach(room => {
    const floor = room.floor || "?";
    if (!floorGroups[floor]) floorGroups[floor] = [];
    floorGroups[floor].push(room);
  });

  const floorKeys = Object.keys(floorGroups).sort((a, b) => String(a).localeCompare(String(b), "vi", { numeric: true }));

  // Render tung tang
  let html = "";
  let tileIndex = 0;
  floorKeys.forEach(floor => {
    const groupRooms = floorGroups[floor].sort((a, b) =>
      String(a.name || a.id).localeCompare(String(b.name || b.id), "vi", { numeric: true })
    );
    html += `<div class="floor-section">
      <div class="floor-header">
        <span class="floor-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>
          Tầng ${escapeHtml(floor)}
        </span>
      </div>
      <div class="floor-grid">`;
    groupRooms.forEach(room => {
      const status = getRoomStatus(room);
      const availableBeds = getAvailableBeds(room);
      const capacity = Number(room.capacity || 0);

      // Bed dots
      let bedDotsHtml = "";
      if (capacity > 0) {
        const occupiedCount = Math.min(capacity - availableBeds, capacity);
        const dots = [];
        for (let i = 0; i < occupiedCount; i++) dots.push('<span class="tile-bed-dot occupied"></span>');
        for (let i = 0; i < availableBeds; i++) dots.push('<span class="tile-bed-dot available"></span>');
        bedDotsHtml = `<div class="tile-beds">${dots.join("")}</div>`;
      }

      const statusLabel = getStatusLabel(status);
      const priceFormatted = formatCurrency(room.price);

      html += `<button class="room-map-tile map-${escapeAttribute(status)}" type="button" data-room-map-id="${escapeAttribute(room.id)}" data-tile-index="${tileIndex}">
        <span class="tile-number">${escapeHtml(room.name || `P.${room.id}`)}</span>
        <span class="tile-status-badge">${statusLabel}</span>
        ${bedDotsHtml}
        <div class="tile-hover-preview">
          <span>${priceFormatted}</span>
          <span>${availableBeds}/${capacity} trống</span>
        </div>
      </button>`;
      tileIndex++;
    });
    html += `</div></div>`;
  });

  map.innerHTML = html;

  // Click + stagger animation
  let totalDelay = 0;
  map.querySelectorAll("[data-room-map-id]").forEach((button) => {
    button.addEventListener("click", () => openRoomModal(button.dataset.roomMapId));
    const idx = parseInt(button.dataset.tileIndex, 10);
    const delay = idx * 50;
    setTimeout(() => {
      button.classList.add("tile-visible");
    }, delay);
    totalDelay = Math.max(totalDelay, delay);
  });

  // Render filter tabs
  renderMapFilterTabs(floorKeys);

  // Init scroll animations for new elements
  initScrollAnimations();
}

// Render cac pill loc tang cho so do phong.
function renderMapFilterTabs(floorKeys) {
  const container = document.getElementById("mapFilterTabs");
  if (!container) return;
  if (!floorKeys.length) { container.innerHTML = ""; return; }

  const uniqueBuildings = [...new Set(publicState.rooms.map(r => r.building).filter(Boolean))];
  let html = `<button class="filter-pill active" data-floor="all">Tất cả</button>`;
  floorKeys.forEach(f => {
    html += `<button class="filter-pill" data-floor="${escapeAttribute(f)}">Tầng ${escapeHtml(f)}</button>`;
  });
  container.innerHTML = html;

  container.querySelectorAll(".filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      container.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const floor = pill.dataset.floor;
      const map = document.getElementById("roomMap");
      const sections = map.querySelectorAll(".floor-section");
      if (floor === "all") {
        sections.forEach(s => s.style.display = "");
      } else {
        sections.forEach(s => {
          const header = s.querySelector(".floor-title");
          s.style.display = header && header.textContent.includes(`Tầng ${floor}`) ? "" : "none";
        });
      }
    });
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
          <button class="btn btn-primary" type="button" data-room-id="${escapeAttribute(room.id)}">Chi tiết</button>
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
  const actionHtml = canRegister
    ? `<button class="btn btn-primary w-100 mt-3" type="button" onclick="openRegisterModal('${escapeAttribute(room.id)}')">Đăng ký phòng ngay</button>`
    : `<div class="room-status-block mt-3">
        <span class="badge ${getStatusBadgeClass(status)}" style="font-size:0.9rem;padding:8px 20px">${status === "maintenance" ? "🔧 Phòng đang bảo trì" : "🚫 Phòng đã đầy"}</span>
        <p class="text-muted mt-2 mb-0 small">${status === "maintenance" ? "Phòng hiện đang được bảo trì. Vui lòng chọn phòng khác." : "Phòng này hiện không còn chỗ trống. Vui lòng chọn phòng khác."}</p>
      </div>`;
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
      ${actionHtml}
    </div>
  </div>`;

  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("roomModal"));
  modal.show();
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
  document.getElementById("registerModalTitle").textContent = `Đăng ký phòng`;
  const summary = document.getElementById("registerRoomSummary");
  if (summary) {
    const images = getRoomImages(room);
    summary.innerHTML = `<div class="register-room-card">
      <div class="register-room-img">
        <img src="${escapeAttribute(images[0])}" alt="${escapeHtml(room.name||"")}" onerror="this.src='${PLACEHOLDER_ROOM_IMAGE}'">
      </div>
      <div class="register-room-info">
        <h3>${escapeHtml(room.name || `Phòng ${room.id}`)}</h3>
        <div class="register-room-meta">
          <span>${escapeHtml(room.building || "?")} · Tầng ${escapeHtml(room.floor || "?")}</span>
          <span>${formatCurrency(room.price)} · ${escapeHtml(room.type || "?")}</span>
        </div>
        <div class="register-room-beds">
          <span class="badge ${getStatusBadgeClass(getRoomStatus(room))}">${getStatusLabel(getRoomStatus(room))}</span>
          <span class="text-muted">${getAvailableBeds(room)} giường trống / ${room.capacity || 0}</span>
        </div>
      </div>
    </div>`;
  }
  const form = document.getElementById("registerForm");
  form.reset();
  form.classList.remove("was-validated");
  document.getElementById("registerRoomId").value = room.id;
  const roomModalEl = document.getElementById("roomModal");
  const roomModal = bootstrap.Modal.getInstance(roomModalEl) || bootstrap.Modal.getOrCreateInstance(roomModalEl);
  roomModal.hide();
  roomModalEl.addEventListener("hidden.bs.modal", () => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("registerModal")).show();
    setTimeout(() => {
      const firstInput = document.querySelector("#registerForm .form-control");
      if (firstInput) firstInput.focus();
    }, 200);
  }, { once: true });
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
    const { id: _rid, ...roomUpdate } = latestRoom;
    await DormAPI.update("rooms", latestRoom.id, {
      ...roomUpdate,
      occupied: nextOccupied,
      status: latestRoom.status === "maintenance" ? "maintenance" : nextStatus
    });
    publicState.rooms = publicState.rooms.map((item) => (
      String(item.id) === String(latestRoom.id)
        ? { ...item, occupied: nextOccupied, status: latestRoom.status === "maintenance" ? "maintenance" : nextStatus }
        : item
    ));
    renderPublicRooms();
    form.reset();
    form.classList.remove("was-validated");
    showToast("Đăng ký thành công!", "success");
    const regModalEl = document.getElementById("registerModal");
    const regModal = bootstrap.Modal.getInstance(regModalEl);
    if (regModal) {
      regModal.hide();
      regModalEl.addEventListener("hidden.bs.modal", () => {
        try { openPaymentChoice(paymentAmount, paymentNote, data.fullName, data.studentCode, latestRoom.name || latestRoom.id); }
        catch (e) { showToast("Lỗi hiển thị thanh toán", "error"); }
      }, { once: true });
    } else {
      try { openPaymentChoice(paymentAmount, paymentNote, data.fullName, data.studentCode, latestRoom.name || latestRoom.id); }
      catch (e) { showToast("Lỗi hiển thị thanh toán", "error"); }
    }
  } catch (error) {
    showToast(`Đăng ký thất bại: ${error.message}`, "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
}

// Mo modal chon phuong thuc thanh toan sau dang ky.
function openPaymentChoice(amount, note, fullName, studentCode, roomName) {
  const modalEl = document.getElementById("paymentChoiceModal");
  if (!modalEl) { openQRModal(amount, note, fullName, studentCode, roomName); return; }

  // Gan data de dung khi chon QR
  modalEl._paymentData = { amount, note, fullName, studentCode, roomName };

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  // Clean old listeners
  const qrOption = document.getElementById("payViaQR");
  const lobbyOption = document.getElementById("payAtLobby");
  const oldQr = qrOption._qrHandler;
  if (oldQr) qrOption.removeEventListener("click", oldQr);
  const oldLobby = lobbyOption._lobbyHandler;
  if (oldLobby) lobbyOption.removeEventListener("click", oldLobby);

  const qrHandler = () => {
    try {
      const d = modalEl._paymentData;
      const params = new URLSearchParams({
        amount: String(d.amount || 0),
        note: d.note || "",
        fullName: d.fullName || "",
        studentCode: d.studentCode || "",
        roomName: d.roomName || ""
      });
      window.location.href = `payment.html?${params.toString()}`;
    } catch (e) {
      console.error("Payment redirect error:", e);
      showToast("Lỗi chuyển trang thanh toán", "error");
    }
  };
  const lobbyHandler = () => {
    modal.hide();
    showToast("Vui lòng đến sảnh ký túc xá để thanh toán trong vòng 48 giờ.", "success");
  };

  qrOption._qrHandler = qrHandler;
  lobbyOption._lobbyHandler = lobbyHandler;
  qrOption.addEventListener("click", qrHandler);
  lobbyOption.addEventListener("click", lobbyHandler);

  modal.show();
}

// Hien modal QR: show modal ngay, load QR dong bat dong bo sau.
function openQRModal(amount, note, fullName, studentCode, roomName) {
  // Fill student info
  document.getElementById("qrName").textContent = escapeHtml(fullName || "—");
  document.getElementById("qrStudentCode").textContent = escapeHtml(studentCode || "—");
  document.getElementById("qrRoomName").textContent = escapeHtml(roomName || "—");

  const amountFormatted = formatCurrency(amount);
  document.getElementById("qrAmount").textContent = amountFormatted;
  document.getElementById("qrNote").textContent = escapeHtml(note || "—");
  document.getElementById("qrAccountNumber").textContent = CONFIG.ACCOUNT_NUMBER;
  document.getElementById("qrAccountHolder").textContent = CONFIG.ACCOUNT_HOLDER;
  document.getElementById("qrBankName").textContent = CONFIG.BANK_NAME;

  // Copy buttons
  const copyAmount = amountFormatted.replace(/\./g, "").replace(/\sđ/g, "");
  setupCopyBtn("copyAccountBtn", CONFIG.ACCOUNT_NUMBER);
  setupCopyBtn("copyNoteBtn", note);

  // Countdown
  startCountdown();

  // Copy all button
  setupCopyAllBtn(amountFormatted, note, fullName, studentCode, roomName);

  // Print
  setupPrintBtn();

  // QR refresh
  const refreshBtn = document.getElementById("qrRefreshBtn");
  if (refreshBtn) {
    const newRefresh = refreshBtn.cloneNode(true);
    refreshBtn.parentNode.replaceChild(newRefresh, refreshBtn);
    newRefresh.addEventListener("click", () => loadQRAsync(amount, note));
  }

  // === PHASE 1: Show modal ngay, fallback QR ===
  const qrImg = document.getElementById("qrImage");
  qrImg.onerror = function () {
    this.src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(buildTransferText(amount, note));
  };
  qrImg.src = CONFIG.TRANSFER_QR_IMAGE;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("qrModal")).show();

  // === PHASE 2: Load QR dong bat dong bo, khong block UI ===
  loadQRAsync(amount, note);
}

// Setup "Copy All" button.
function setupCopyAllBtn(amountFormatted, note, fullName, studentCode, roomName) {
  const btn = document.getElementById("qrCopyAllBtn");
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener("click", async () => {
    const text = buildTransferText(
      Number(amountFormatted.replace(/[^\d]/g, "")),
      note
    );
    const ok = await copyToClipboard(text);
    if (ok) {
      const orig = newBtn.innerHTML;
      newBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg> Đã sao chép!`;
      newBtn.classList.add("copied");
      setTimeout(() => { newBtn.innerHTML = orig; newBtn.classList.remove("copied"); }, 2000);
    }
  });
}

// Setup Print button with clean clone.
function setupPrintBtn() {
  const printBtn = document.getElementById("qrPrintBtn");
  if (!printBtn) return;
  const newBtn = printBtn.cloneNode(true);
  printBtn.parentNode.replaceChild(newBtn, printBtn);
  newBtn.addEventListener("click", () => {
    const qrModalEl = document.getElementById("qrModal");
    const modalInstance = bootstrap.Modal.getInstance(qrModalEl);
    if (modalInstance) modalInstance.hide();
    qrModalEl.addEventListener("hidden.bs.modal", () => { window.print(); }, { once: true });
  });
}

// Tai QR tu VietQR API bat dong bo, khong anh huong den modal da show.
async function loadQRAsync(amount, note) {
  const loader = document.getElementById("qrLoader");
  if (loader) loader.classList.remove("hidden");
  try {
    const qrUrl = await getTransferQRCodeUrl(amount, note);
    document.getElementById("qrImage").src = qrUrl;
  } catch (err) { }
  finally {
    if (loader) loader.classList.add("hidden");
  }
}

// Setup copy button UI.
function setupCopyBtn(id, textValue) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener("click", async () => {
    const ok = await copyToClipboard(textValue);
    if (ok) {
      newBtn.classList.add("copied");
      const tooltip = newBtn.querySelector(".copy-tooltip");
      if (tooltip) tooltip.textContent = "Đã sao chép!";
      setTimeout(() => {
        newBtn.classList.remove("copied");
        if (tooltip) tooltip.textContent = "Sao chép";
      }, 2000);
    }
  });
}

// Dem nguoc 30 phut cho QR.
let countdownInterval = null;
function startCountdown() {
  const digits = document.getElementById("countdownDigits");
  if (!digits) return;
  if (countdownInterval) clearInterval(countdownInterval);

  let totalSec = 1800;
  const update = () => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    digits.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    const parent = digits.closest(".qr-countdown");
    if (parent) parent.classList.toggle("urgent", totalSec <= 300);
    if (totalSec <= 0) {
      clearInterval(countdownInterval);
      digits.textContent = "Hết hạn";
    }
    totalSec--;
  };
  update();
  countdownInterval = setInterval(update, 1000);
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

// Dung IntersectionObserver de them hieu ung fade-in-up khi keo man hinh.
function initScrollAnimations() {
  const els = document.querySelectorAll(".fade-in-up:not(.initialized)");
  if (!els.length) return;
  if (!window.__scrollObserver) {
    window.__scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed", "initialized");
          window.__scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  }
  els.forEach(el => {
    el.classList.add("initialized");
    window.__scrollObserver.observe(el);
  });
}

// ═══════════════════════════════════════
// PUBLIC THEME SYSTEM
// ═══════════════════════════════════════
function initPublicTheme() {
  const saved = localStorage.getItem("dormManagerTheme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
}

function togglePublicTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("dormManagerTheme", next);
}

/* ══ BACK TO TOP ══ */
function initBackToTop() {
  const btn = document.getElementById("backToTop");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ══ PRICE GRID ══ */
function renderPriceGrid() {
  const grid = document.getElementById("priceGrid");
  if (!grid || !publicState.rooms.length) return;

  // Group rooms by type
  const groups = new Map();
  for (const r of publicState.rooms) {
    const key = r.type || `${r.capacity || "?"} người`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  // Pick representative for each group (pick cheapest per group)
  const reps = [];
  for (const [type, rooms] of groups) {
    const sorted = rooms.sort((a, b) => (a.price || 0) - (b.price || 0));
    reps.push(sorted[0]);
  }

  // Sort reps by price, pick up to 4
  const sorted = reps.sort((a, b) => (a.price || 0) - (b.price || 0)).slice(0, 4);

  // Mark the middle one as "popular"
  const popularIndex = Math.floor(sorted.length / 2);

  // Attach click handler after rendering
  grid.innerHTML = sorted.map((r, i) => {
    const priceFormatted = formatCurrency(r.price || 0);
    const pricePerPerson = formatCurrency(Math.ceil((r.price || 0) / Math.max(r.capacity || 1, 1)));
    const label = r.type || `${r.capacity || "?"} người`;
    const images = getRoomImages(r);
    const img = images[0] || PLACEHOLDER_ROOM_IMAGE;
    const amenities = parseAmenities(r.amenities).slice(0, 4);
    const defaultAmenities = amenities.length ? amenities : ["Điều hòa", "WiFi", "Nước nóng", "Giường tầng"];
    const isPopular = i === popularIndex && sorted.length > 1;

    return `<div class="price-card" data-room-id="${escapeAttribute(r.id)}" role="button" tabindex="0">
      <div class="price-card-img" style="background-image:url('${escapeAttribute(img)}')">
        ${isPopular ? '<span class="price-badge">Phổ biến nhất</span>' : ''}
      </div>
      <div class="price-card-body">
        <div class="price-card-top">
          <span class="price-type">${escapeHtml(label)}</span>
          <span class="price-capacity">${r.capacity || "?"} người · ${escapeHtml(r.building || "?")}</span>
        </div>
        <div class="price-amount">${priceFormatted}</div>
        <div class="price-per">${pricePerPerson}/người/tháng</div>
        <div class="price-amenities">
          ${defaultAmenities.map(a => `<span>✓ ${escapeHtml(a)}</span>`).join("")}
        </div>
        <button class="price-btn" type="button">Chọn phòng</button>
      </div>
    </div>`;
  }).join("");

  // Bind click to open room modal
  grid.querySelectorAll(".price-card").forEach(card => {
    const id = card.dataset.roomId;
    if (id) card.addEventListener("click", () => openRoomModal(id));
  });
}



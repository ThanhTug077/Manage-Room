// Cac hang so dung chung cho anh phong mac dinh va thong tin thanh toan.
const PLACEHOLDER_ROOM_IMAGE = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80";
const TRANSFER_QR_IMAGE = "img/payment.png";
const BANK_NAME = "Ngân hàng VCB ";
const ACCOUNT_NUMBER = "035821634";
const ACCOUNT_HOLDER = "DOAN THANH TUNG";

// Chuyen ky tu dac biet thanh HTML entity de tranh chen HTML/script vao giao dien.
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"'`]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
    "`": "&#96;"
  })[char]);
}

// Dung rieng khi dua du lieu vao attribute HTML nhu value, src, alt, data-id.
function escapeAttribute(value) {
  return escapeHtml(value);
}

// Lay thang thanh toan hien tai theo dinh dang YYYY-MM.
function getCurrentPaymentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Tao noi dung chuyen khoan de admin va sinh vien doi chieu thanh toan.
function buildPaymentNote(studentCode, roomNameOrId, paymentMonth) {
  return `DORM ${studentCode} ${roomNameOrId} ${paymentMonth}`.trim();
}

// Tao HTML huong dan chuyen khoan; cac gia tri dong duoc escape truoc khi render.
function buildTransferInstruction(amount, note) {
  return `Số tiền chuyển khoản: <strong>${formatCurrency(amount)}</strong><br>` +
    `Nội dung chuyển khoản: <strong>${escapeHtml(note)}</strong><br>` +
    `Ngân hàng nhận: <strong>${escapeHtml(BANK_NAME)}</strong><br>` +
    `Số tài khoản: <strong>${escapeHtml(ACCOUNT_NUMBER)}</strong><br>` +
    `Chủ tài khoản: <strong>${escapeHtml(ACCOUNT_HOLDER)}</strong>`;
}

// Tao ban text thuan cua thong tin chuyen khoan neu can copy/ghi log.
function buildTransferText(amount, note) {
  return `Ngân hàng: ${BANK_NAME}\nSố tài khoản: ${ACCOUNT_NUMBER}\nChủ tài khoản: ${ACCOUNT_HOLDER}\nSố tiền: ${formatCurrency(amount)}\nNội dung: ${note}`;
}

// Hien tai dung mot anh QR co dinh trong thu muc img.
function getTransferQRCodeUrl(amount, note) {
  return TRANSFER_QR_IMAGE;
}

// Format so tien theo tien Viet Nam de hien thi thong nhat tren public va admin.
function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND"
  });
}

// Format ngay theo locale vi-VN; neu du lieu khong phai ngay hop le thi giu nguyen gia tri goc.
function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

// Chuan hoa chuoi de tim kiem khong phan biet hoa thuong va dau tieng Viet.
function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Chuyen tien nghi tu chuoi "Wifi, May lanh" hoac mang thanh mang gia tri sach.
function parseAmenities(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Chuyen danh sach tien nghi ve chuoi ngan cach bang dau phay de hien thi trong form/detail.
function amenitiesToString(value) {
  return parseAmenities(value).join(", ");
}

// Tinh so giuong con trong, khong bao gio tra ve so am.
function getAvailableBeds(room) {
  return Math.max(Number(room.capacity || 0) - Number(room.occupied || 0), 0);
}

// Xac dinh trang thai phong tu du lieu suc chua; maintenance duoc uu tien cao nhat.
function getRoomStatus(room) {
  if (room.status === "maintenance") return "maintenance";
  if (getAvailableBeds(room) <= 0) return "full";
  if (room.status === "full") return "full";
  return getAvailableBeds(room) > 0 ? "available" : "full";
}

// Doi ma trang thai sang nhan tieng Viet de hien thi cho nguoi dung.
function getStatusLabel(status) {
  const labels = {
    available: "Còn chỗ",
    full: "Đã đầy",
    maintenance: "Bảo trì",
    active: "Đang ở",
    inactive: "Đã rời",
    paid: "Đã thanh toán",
    unpaid: "Chưa thanh toán",
    overdue: "Quá hạn"
  };
  return labels[status] || status || "Chưa rõ";
}

// Chon class mau badge theo nhom trang thai: tot, can chu y, loi/qua han.
function getStatusBadgeClass(status) {
  if (["available", "active", "paid"].includes(status)) return "badge-soft-success";
  if (["maintenance", "unpaid"].includes(status)) return "badge-soft-warning";
  if (["full", "overdue"].includes(status)) return "badge-soft-danger";
  return "badge-soft-secondary";
}

// Chi chap nhan anh dang data URL hoac URL http/https de tranh gia tri src khong an toan.
function isValidImageUrl(value) {
  if (!value) return true;
  if (String(value).startsWith("data:image/")) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch (error) {
    return false;
  }
}

// Kiem tra cac truong so tien/suc chua phai la so duong.
function isPositiveNumber(value) {
  return Number(value) > 0;
}

// Hien toast Bootstrap o goc man hinh; message duoc escape truoc khi chen vao DOM.
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toastId = `toast-${Date.now()}`;
  const bgClass = type === "error" ? "text-bg-danger" : type === "warning" ? "text-bg-warning" : "text-bg-success";
  container.insertAdjacentHTML(
    "beforeend",
    `<div id="${toastId}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Đóng"></button>
      </div>
    </div>`
  );

  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 3200 });
  toast.show();
  toastElement.addEventListener("hidden.bs.toast", () => toastElement.remove());
}

// Doi nut sang trang thai loading de tranh bam lap trong luc dang gui request.
function setButtonLoading(button, isLoading, loadingText = "Đang xử lý...") {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${loadingText}`;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || button.innerHTML;
  }
}

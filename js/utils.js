const PLACEHOLDER_ROOM_IMAGE = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80";
const TRANSFER_QR_IMAGE = "img/payment.png";
const BANK_NAME = "Ngân hàng VCB ";
const ACCOUNT_NUMBER = "035821634";
const ACCOUNT_HOLDER = "DOAN THANH TUNG";

function getCurrentPaymentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildPaymentNote(studentCode, roomNameOrId, paymentMonth) {
  return `DORM ${studentCode} ${roomNameOrId} ${paymentMonth}`.trim();
}

function buildTransferInstruction(amount, note) {
  return `Số tiền chuyển khoản: <strong>${formatCurrency(amount)}</strong><br>` +
    `Nội dung chuyển khoản: <strong>${note}</strong><br>` +
    `Ngân hàng nhận: <strong>${BANK_NAME}</strong><br>` +
    `Số tài khoản: <strong>${ACCOUNT_NUMBER}</strong><br>` +
    `Chủ tài khoản: <strong>${ACCOUNT_HOLDER}</strong>`;
}

function buildTransferText(amount, note) {
  return `Ngân hàng: ${BANK_NAME}\nSố tài khoản: ${ACCOUNT_NUMBER}\nChủ tài khoản: ${ACCOUNT_HOLDER}\nSố tiền: ${formatCurrency(amount)}\nNội dung: ${note}`;
}

function getTransferQRCodeUrl(amount, note) {
  return TRANSFER_QR_IMAGE;
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND"
  });
}

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseAmenities(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function amenitiesToString(value) {
  return parseAmenities(value).join(", ");
}

function getAvailableBeds(room) {
  return Math.max(Number(room.capacity || 0) - Number(room.occupied || 0), 0);
}

function getRoomStatus(room) {
  if (room.status) return room.status;
  return getAvailableBeds(room) > 0 ? "available" : "full";
}

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

function getStatusBadgeClass(status) {
  if (["available", "active", "paid"].includes(status)) return "badge-soft-success";
  if (["maintenance", "unpaid"].includes(status)) return "badge-soft-warning";
  if (["full", "overdue"].includes(status)) return "badge-soft-danger";
  return "badge-soft-secondary";
}

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

function isPositiveNumber(value) {
  return Number(value) > 0;
}

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toastId = `toast-${Date.now()}`;
  const bgClass = type === "error" ? "text-bg-danger" : type === "warning" ? "text-bg-warning" : "text-bg-success";
  container.insertAdjacentHTML(
    "beforeend",
    `<div id="${toastId}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Đóng"></button>
      </div>
    </div>`
  );

  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 3200 });
  toast.show();
  toastElement.addEventListener("hidden.bs.toast", () => toastElement.remove());
}

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

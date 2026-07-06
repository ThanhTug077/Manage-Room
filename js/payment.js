function getPaymentParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    amount: p.get("amount") || "0",
    note: p.get("note") || "",
    fullName: p.get("fullName") || "",
    studentCode: p.get("studentCode") || "",
    roomName: p.get("roomName") || ""
  };
}

function initPaymentTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  const btn = document.getElementById("publicThemeToggle");
  if (btn) btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

function setupPaymentCopyBtn(id, textValue) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener("click", async () => {
    const ok = await copyToClipboard(textValue);
    if (ok) {
      const tooltip = newBtn.querySelector(".payment-copy-tooltip");
      if (tooltip) {
        const orig = tooltip.textContent;
        tooltip.textContent = "Đã sao chép!";
        setTimeout(() => { tooltip.textContent = orig; }, 1500);
      }
    }
  });
}

function setupPaymentCopyAllBtn(amountFormatted, note, fullName, studentCode, roomName) {
  const btn = document.getElementById("paymentCopyAllBtn");
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
      newBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg> Đã sao chép!`;
      newBtn.classList.add("copied");
      setTimeout(() => { newBtn.innerHTML = orig; newBtn.classList.remove("copied"); }, 2000);
    }
  });
}

function setupPaymentPrintBtn() {
  const btn = document.getElementById("paymentPrintBtn");
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener("click", () => { window.print(); });
}

function setupPaymentConfirmBtn(studentCode, note, amount) {
  const btn = document.getElementById("paymentConfirmBtn");
  if (!btn || !studentCode) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener("click", async () => {
    if (!confirm("Bạn đã chuyển khoản đúng số tiền và nội dung?")) return;
    setButtonLoading(newBtn, true, "Đang xác nhận...");
    try {
      const students = await DormAPI.list("students");
      const match = students.find(s =>
        s.studentCode === studentCode &&
        s.paymentStatus === "unpaid"
      );
      if (!match) {
        showToast("Không tìm thấy thông tin đăng ký. Vui lòng liên hệ quản lý.", "warning");
        setButtonLoading(newBtn, false);
        return;
      }
      await DormAPI.update("students", match.id, {
        ...match,
        paymentStatus: "paid",
        paidAt: new Date().toISOString()
      });
      showToast("Xác nhận thanh toán thành công!", "success");
      setTimeout(() => { window.location.href = "index.html"; }, 2000);
    } catch (e) {
      showToast("Lỗi xác nhận: " + e.message, "error");
      setButtonLoading(newBtn, false);
    }
  });
}

function startPaymentCountdown() {
  const digits = document.getElementById("paymentCountdownDigits");
  const container = document.getElementById("paymentCountdown");
  if (!digits || !container) return;
  let remaining = 1800;
  const interval = setInterval(() => {
    remaining--;
    if (remaining <= 0) { clearInterval(interval); digits.textContent = "00:00"; return; }
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    digits.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    if (remaining <= 300) container.classList.add("urgent");
  }, 1000);
  return () => clearInterval(interval);
}

async function loadPaymentQR(amount, note) {
  const loader = document.getElementById("paymentQrLoader");
  const img = document.getElementById("paymentQrImage");
  if (loader) loader.classList.remove("hidden");
  try {
    const qrUrl = await getTransferQRCodeUrl(amount, note);
    const loadPromise = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = qrUrl;
    });
    await loadPromise;
  } catch {
    img.src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(buildTransferText(amount, note));
  } finally {
    if (loader) loader.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initPaymentTheme();

  const params = getPaymentParams();
  if (!params.amount || params.amount === "0") {
    document.querySelector(".payment-main").innerHTML = '<div class="container"><div class="empty-state" style="padding:120px 0">Không có thông tin thanh toán. <a href="index.html">Quay lại trang chủ</a>.</div></div>';
    return;
  }

  const amountFormatted = formatCurrency(params.amount);

  document.getElementById("paymentAmount").textContent = amountFormatted;
  document.getElementById("paymentNote").textContent = escapeHtml(params.note || "—");
  document.getElementById("paymentAccountNumber").textContent = CONFIG.ACCOUNT_NUMBER;
  document.getElementById("paymentAccountHolder").textContent = CONFIG.ACCOUNT_HOLDER;
  document.getElementById("paymentBankName").textContent = CONFIG.BANK_NAME;
  document.getElementById("paymentName").textContent = escapeHtml(params.fullName || "—");
  document.getElementById("paymentStudentCode").textContent = escapeHtml(params.studentCode || "—");
  document.getElementById("paymentRoomName").textContent = escapeHtml(params.roomName || "—");

  setupPaymentCopyBtn("paymentCopyAccountBtn", CONFIG.ACCOUNT_NUMBER);
  setupPaymentCopyBtn("paymentCopyNoteBtn", params.note);
  setupPaymentCopyAllBtn(amountFormatted, params.note, params.fullName, params.studentCode, params.roomName);
  setupPaymentPrintBtn();
  setupPaymentConfirmBtn(params.studentCode, params.note, params.amount);
  startPaymentCountdown();

  const refreshBtn = document.getElementById("paymentRefreshBtn");
  if (refreshBtn) {
    const newRefresh = refreshBtn.cloneNode(true);
    refreshBtn.parentNode.replaceChild(newRefresh, refreshBtn);
    newRefresh.addEventListener("click", () => loadPaymentQR(params.amount, params.note));
  }

  loadPaymentQR(params.amount, params.note);
});

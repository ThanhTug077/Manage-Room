// Student portal: login, dashboard, payment info
document.addEventListener("DOMContentLoaded", () => {
  if (Auth.isLoggedIn() && !Auth.isAdmin()) {
    showStudentDashboard();
  }
  document.getElementById("studentLoginForm").addEventListener("submit", handleStudentLogin);
  document.getElementById("studentLogoutBtn").addEventListener("click", handleStudentLogout);
});

async function handleStudentLogin(e) {
  e.preventDefault();
  const input = document.getElementById("studentCodeInput");
  const btn = e.currentTarget.querySelector("button[type=submit]");
  input.classList.remove("is-invalid");

  if (!input.value.trim()) {
    input.classList.add("is-invalid");
    return;
  }

  setButtonLoading(btn, true, "Đang tra cứu...");
  try {
    const result = await Auth.studentLogin(input.value.trim());
    if (!result.ok) {
      input.classList.add("is-invalid");
      input.nextElementSibling.textContent = "Không tìm thấy mã sinh viên này.";
      showToast("Không tìm thấy mã sinh viên", "warning");
      return;
    }
    showStudentDashboard();
  } catch (err) {
    showToast("Lỗi kết nối: " + err.message, "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

function handleStudentLogout() {
  Auth.logout();
  document.getElementById("studentDashboard").style.display = "none";
  document.getElementById("studentLoginSection").style.display = "";
  document.getElementById("studentCodeInput").value = "";
  showToast("Đã đăng xuất", "success");
}

async function showStudentDashboard() {
  const user = Auth.getUser();
  if (!user || user.type !== "student") return;

  document.getElementById("studentLoginSection").style.display = "none";
  document.getElementById("studentDashboard").style.display = "block";
  document.getElementById("studWelcome").textContent = `Xin chào, ${user.fullName || "Sinh viên"}!`;

  try {
    const [rooms, students] = await Promise.all([
      DormAPI.list("rooms"),
      DormAPI.list("students")
    ]);

    const student = students.find(s => String(s.id) === String(user.id));
    if (!student) { showToast("Không tìm thấy dữ liệu sinh viên", "error"); return; }

    const room = rooms.find(r => String(r.id) === String(student.roomId));

    document.getElementById("sFullName").textContent = escapeHtml(student.fullName || "—");
    document.getElementById("sStudentCode").textContent = escapeHtml(student.studentCode || "—");
    document.getElementById("sRoomName").textContent = room ? escapeHtml(room.name || room.id) : "—";
    document.getElementById("sStatus").innerHTML = `<span class="badge ${getStatusBadgeClass(student.status)}">${getStatusLabel(student.status)}</span>`;

    const payStatus = student.paymentStatus || "unpaid";
    const payAmount = formatCurrency(student.paymentAmount || 0);
    const payMonth = student.paymentMonth || "—";
    const payDate = student.paidAt ? formatDate(student.paidAt) : "—";
    const payLabel = getStatusLabel(payStatus);
    const payBadge = getStatusBadgeClass(payStatus);

    document.getElementById("studentPaymentInfo").innerHTML = `
      <div class="row g-3 mt-2">
        <div class="col-6 col-md-3"><small style="color:#e5e7eb;display:block;font-size:.75rem">Kỳ thanh toán</small><strong>${escapeHtml(payMonth)}</strong></div>
        <div class="col-6 col-md-3"><small style="color:#e5e7eb;display:block;font-size:.75rem">Số tiền</small><strong>${payAmount}</strong></div>
        <div class="col-6 col-md-3"><small style="color:#e5e7eb;display:block;font-size:.75rem">Trạng thái</small><span class="badge ${payBadge}">${payLabel}</span></div>
        <div class="col-6 col-md-3"><small style="color:#e5e7eb;display:block;font-size:.75rem">Ngày thanh toán</small><strong>${escapeHtml(payDate)}</strong></div>
      </div>
      ${payStatus === "unpaid" ? `<div class="mt-3"><a href="payment.html?amount=${student.paymentAmount || 0}&note=${encodeURIComponent(student.paymentNote || "")}&fullName=${encodeURIComponent(student.fullName || "")}&studentCode=${encodeURIComponent(student.studentCode || "")}&roomName=${encodeURIComponent(room ? room.name : "")}" class="btn btn-primary btn-sm">Thanh toán ngay</a></div>` : ""}
    `;

  } catch (err) {
    showToast("Lỗi tải dữ liệu: " + err.message, "error");
  }
}
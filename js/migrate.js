// Migration: chuyen payment tu student record sang resource `payments` rieng
// Chay 1 lan tu console: migratePayments()
// Yeu cau: resource `payments` da duoc tao tren MockAPI

async function migratePayments() {
  const btn = document.getElementById("migrateBtn");
  if (btn) setButtonLoading(btn, true, "Đang migrate...");

  try {
    const students = await DormAPI.list("students", { force: true });
    let existing = [];
    try { existing = await DormAPI.list("payments", { force: true }); } catch (e) { /* resource moi */ }

    const existingKeys = new Set(existing.map(p => `${p.studentId}_${p.paymentMonth}`));
    let created = 0, skipped = 0;

    for (const s of students) {
      const amount = Number(s.paymentAmount || 0);
      if (amount <= 0) { skipped++; continue; }

      const month = s.paymentMonth || "";
      const key = `${s.id}_${month}`;
      if (existingKeys.has(key)) { skipped++; continue; }

      await DormAPI.create("payments", {
        studentId: s.id,
        roomId: s.roomId || "",
        paymentAmount: amount,
        paymentMonth: month,
        paymentStatus: s.paymentStatus || "unpaid",
        paidAt: s.paidAt || "",
        paymentNote: s.paymentNote || ""
      });
      created++;
    }

    const msg = `Migration hoan tat: ${created} tao moi, ${skipped} bo qua.`;
    showToast(msg, "success");
    console.log(msg);
  } catch (err) {
    showToast("Migration that bai: " + err.message, "error");
    console.error(err);
  } finally {
    if (btn) setButtonLoading(btn, false);
  }
}
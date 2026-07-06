// Chart instances holder
const chartInstances = {};

// Default chart config
const chartDefaults = {
  color: (ctx) => {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    return isDark ? "#9ca3af" : "#6b7280";
  },
  grid: (ctx) => {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    return isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  }
};

function getChartColors() {
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  return {
    text: isDark ? "#9ca3af" : "#6b7280",
    grid: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
    gold: isDark ? "#c9a96e" : "#b8944e",
    success: isDark ? "#10b981" : "#059669",
    warning: isDark ? "#f59e0b" : "#d97706",
    danger: isDark ? "#ef4444" : "#dc2626"
  };
}

function initRevenueChart(data, labels) {
  const c = getChartColors();
  const ctx = document.getElementById("revenueChart")?.getContext("2d");
  if (!ctx) return;
  if (chartInstances.revenue) chartInstances.revenue.destroy();

  chartInstances.revenue = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels || ["T1","T2","T3","T4","T5","T6"],
      datasets: [{
        label: "Doanh thu (VNĐ)",
        data: data || [0,0,0,0,0,0],
        borderColor: c.gold,
        backgroundColor: c.gold + "15",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: c.gold,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: c.text, font: { size: 10 } },
          grid: { color: c.grid }
        },
        y: {
          ticks: { color: c.text, font: { size: 10 }, callback: v => v >= 1000000 ? (v/1000000)+"M" : v },
          grid: { color: c.grid }
        }
      }
    }
  });
}

function initPaymentChart(paid, unpaid, overdue) {
  const c = getChartColors();
  const ctx = document.getElementById("paymentChart")?.getContext("2d");
  if (!ctx) return;
  if (chartInstances.payment) chartInstances.payment.destroy();

  chartInstances.payment = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Đã thanh toán", "Chưa TT", "Quá hạn"],
      datasets: [{
        data: [paid || 0, unpaid || 0, overdue || 0],
        backgroundColor: [c.success, c.warning, c.danger],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: c.text, font: { size: 10 }, padding: 12 }
        }
      }
    }
  });
}

function initRoomChart(data, labels) {
  const c = getChartColors();
  const ctx = document.getElementById("roomChart")?.getContext("2d");
  if (!ctx) return;
  if (chartInstances.room) chartInstances.room.destroy();

  chartInstances.room = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels || ["A","B","C"],
      datasets: [{
        label: "Số phòng",
        data: data || [0,0,0],
        backgroundColor: c.gold + "35",
        borderColor: c.gold,
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: c.text, font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: c.text, font: { size: 10 }, stepSize: 1 },
          grid: { color: c.grid }
        }
      }
    }
  });
}

function initStudentChart(data, labels) {
  const c = getChartColors();
  const ctx = document.getElementById("studentChart")?.getContext("2d");
  if (!ctx) return;
  if (chartInstances.student) chartInstances.student.destroy();

  chartInstances.student = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels || ["T1","T2","T3","T4","T5","T6"],
      datasets: [{
        label: "Sinh viên mới",
        data: data || [0,0,0,0,0,0],
        borderColor: c.success,
        backgroundColor: c.success + "15",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: c.success,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: c.text, font: { size: 10 } },
          grid: { color: c.grid }
        },
        y: {
          ticks: { color: c.text, font: { size: 10 }, stepSize: 1 },
          grid: { color: c.grid }
        }
      }
    }
  });
}

function destroyAllCharts() {
  Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch(e) {} });
}

function updateChartsTheme() {
  const c = getChartColors();
  Object.entries(chartInstances).forEach(([key, chart]) => {
    if (!chart) return;
    chart.options.scales?.x?.ticks && (chart.options.scales.x.ticks.color = c.text);
    chart.options.scales?.y?.ticks && (chart.options.scales.y.ticks.color = c.text);
    chart.options.scales?.x?.grid && (chart.options.scales.x.grid.color = c.grid);
    chart.options.scales?.y?.grid && (chart.options.scales.y.grid.color = c.grid);
    if (chart.options.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = c.text;
    }
    chart.update("none");
  });
}

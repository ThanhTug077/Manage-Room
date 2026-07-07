// Auth module: login, logout, session, role check
// Phu thuoc DormAPI (js/api.js) — load sau api.js

const Auth = {
  _KEY: "dormUser",

  // Hash don gian (khong can HTTPS), tot hon plain text
  _hash(str) {
    let h = 0;
    for (let i = 0; i < (str || "").length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return "h" + Math.abs(h).toString(36);
  },

  _save(user) {
    sessionStorage.setItem(this._KEY, JSON.stringify(user));
  },

  getUser() {
    try { return JSON.parse(sessionStorage.getItem(this._KEY)); } catch (e) { return null; }
  },

  isLoggedIn() { return !!this.getUser(); },

  isAdmin() {
    const u = this.getUser();
    return u && u.type === "admin";
  },

  hasRole(...roles) {
    const u = this.getUser();
    return u && u.type === "admin" && roles.includes(u.role);
  },

  logout() {
    sessionStorage.removeItem(this._KEY);
  },

  // ── Admin login: uu tien API, fallback admin/admin ──
  async adminLogin(username, password) {
    const hash = this._hash(password);

    try {
      const list = await DormAPI.list("admins");
      const match = list.find(a => a.username === username);
      if (match && match.passwordHash === hash) {
        this._save({ type: "admin", username, role: match.role || "admin" });
        return { ok: true, role: match.role || "admin" };
      }
    } catch (e) { /* silent — fallback */ }

    if (username === "admin" && password === "admin") {
      this._save({ type: "admin", username, role: "super_admin" });
      return { ok: true, role: "super_admin" };
    }

    return { ok: false };
  },

  // ── Student login: bang MSSV ──
  async studentLogin(studentCode) {
    try {
      const list = await DormAPI.list("students");
      const match = list.find(s => s.studentCode === studentCode);
      if (!match) return { ok: false };
      this._save({
        type: "student",
        id: match.id,
        fullName: match.fullName,
        studentCode: match.studentCode,
        roomId: match.roomId
      });
      return { ok: true, student: match };
    } catch (e) { return { ok: false }; }
  }
};
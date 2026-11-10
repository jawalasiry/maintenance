/* =====================================================
   app.js  -  نقطة التشغيل: يرسم الهيكل (قائمة + شريط) ثم الصفحة
   ===================================================== */

/* ---------- عناصر القائمة الجانبية لكل دور (حسب الـBRD) ---------- */
const NAV = {
  beneficiary: [
    { id: "dashboard", label: "الرئيسية", icon: "home" },
    { id: "requests", label: "طلباتي", icon: "list" },
  ],
  rep: [
    { id: "dashboard", label: "الرئيسية", icon: "home" },
    { id: "requests", label: "طلبات الوكالة", icon: "list" },
  ],
  coordinator: [
    { id: "dashboard", label: "الرئيسية", icon: "home" },
    { id: "requests", label: "جميع الطلبات", icon: "list" },
    { id: "escalations", label: "التصعيدات", icon: "alert" },
    { id: "reports", label: "التقارير", icon: "chart" },
  ],
  technician: [
    { id: "dashboard", label: "الرئيسية", icon: "home" },
    { id: "requests", label: "مهامي", icon: "wrench" },
  ],
  manager: [
    { id: "dashboard", label: "الرئيسية", icon: "home" },
    { id: "requests", label: "جميع الطلبات", icon: "list" },
    { id: "escalations", label: "التصعيدات", icon: "alert" },
    { id: "reports", label: "التقارير", icon: "chart" },
  ],
  executive: [
    { id: "dashboard", label: "الرئيسية", icon: "home" },
    { id: "escalations", label: "التصعيدات", icon: "alert" },
    { id: "reports", label: "التقارير المختصرة", icon: "chart" },
  ],
  admin: [
    { id: "dashboard", label: "الرئيسية", icon: "home" },
    { id: "users", label: "المستخدمون", icon: "users" },
    { id: "systemdata", label: "بيانات النظام", icon: "database" },
    { id: "settings", label: "إعدادات الخدمة", icon: "settings" },
  ],
};

// عناوين الصفحات التي ليست في القائمة
const EXTRA_TITLES = { details: "تفاصيل الطلب", newRequest: "طلب جديد" };

function pageTitle() {
  const item = NAV[state.user.role].find((n) => n.id === state.page);
  return item ? item.label : EXTRA_TITLES[state.page] || "";
}

/* ---------- صفحة "قيد البناء" للصفحات التي لم نبنها بعد ---------- */
PAGES.placeholder = function () {
  return `
  <div class="card placeholder">
    <div class="stat-icon tone-amber">${icon("hammer")}</div>
    <h2>${pageTitle() || "هذه الصفحة"}</h2>
    <p>هذه الصفحة سنبنيها في الخطوة القادمة.</p>
    <button class="btn btn-secondary" onclick="go('dashboard')">العودة للرئيسية</button>
  </div>`;
};

/* ---------- الإشعارات ---------- */
function myNotifications() {
  return DATA.notifications
    .filter((n) => n.userId === state.user.id)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}
function toggleNotif() { state.notifOpen = !state.notifOpen; render(); }
function toggleMenu() { state.menuOpen = !state.menuOpen; render(); }
function markAllRead() {
  myNotifications().forEach((n) => (n.read = true));
  render();
}
function openNotif(id) {
  const n = DATA.notifications.find((x) => x.id === id);
  if (n) { n.read = true; go("details", { id: n.requestId }); }
}

function notifPanel() {
  const list = myNotifications();
  const items = list.length
    ? list.map((n) => {
        const r = getRequest(n.requestId);
        return `<button class="notif-item ${n.read ? "" : "unread"}" onclick="openNotif('${n.id}')">
          <span class="notif-dot ${n.read ? "read" : ""}"></span>
          <span>
            <div class="notif-title">${esc(n.title)}</div>
            <div class="notif-meta"><span class="ltr">${r ? r.ref : ""}</span> • ${fmtDateTime(n.at)}</div>
          </span>
        </button>`;
      }).join("")
    : '<div class="empty">لا توجد إشعارات.</div>';

  return `
  <div class="notif-panel">
    <div class="notif-head">
      <span>الإشعارات</span>
      <button class="link" onclick="markAllRead()">تحديد الكل كمقروء</button>
    </div>
    <div class="notif-list">${items}</div>
  </div>`;
}

/* ---------- الهيكل العام ---------- */
function shell(content) {
  const u = state.user;
  const unread = myNotifications().filter((n) => !n.read).length;
  const nav = NAV[u.role]
    .map((n) => `
      <button class="nav-item ${state.page === n.id ? "active" : ""}" onclick="go('${n.id}',{reset:true})">
        ${icon(n.icon)} <span>${n.label}</span>
      </button>`)
    .join("");

  return `
  <div class="shell">
    <aside class="sidebar ${state.menuOpen ? "open" : ""}">
      <div class="brand">
        <div class="brand-logo">${icon("wrench")}</div>
        <div>
          <div class="brand-title">نظام إدارة طلبات</div>
          <div class="brand-sub">الصيانة الداخلية</div>
        </div>
      </div>

      <div class="nav-label">مساحة العمل</div>
      <nav class="nav">${nav}</nav>

      <div class="sidebar-bottom">
        <div class="demo-clock">${icon("clock")} وقت العرض: ${fmtDateTime(DATA.now)}</div>
        <div class="user-card">
          <div class="avatar">${esc(u.name.charAt(0))}</div>
          <div>
            <div class="user-name">${esc(u.name)}</div>
            <div class="user-role">${DATA.roles[u.role]} • ${esc(getUnit(u.unitId).name)}</div>
          </div>
        </div>
        <button class="logout" onclick="logout()">${icon("logout")} تسجيل الخروج</button>
      </div>
    </aside>
    <div class="overlay ${state.menuOpen ? "show" : ""}" onclick="toggleMenu()"></div>

    <div class="main">
      <header class="topbar">
        <div class="topbar-start">
          <button class="icon-btn menu-btn" onclick="toggleMenu()" aria-label="القائمة">${icon("menu")}</button>
          <div>
            <div class="topbar-sys">نظام إدارة طلبات الصيانة</div>
            <div class="topbar-title">${pageTitle()}</div>
          </div>
        </div>
        <div class="topbar-end">
          <button class="icon-btn" onclick="toggleNotif()" aria-label="الإشعارات">
            ${icon("bell")}
            ${unread ? `<span class="bell-count">${unread}</span>` : ""}
          </button>
          ${state.notifOpen ? notifPanel() : ""}
        </div>
      </header>
      <main class="content">${content}</main>
    </div>
    ${typeof renderModal === "function" ? renderModal() : ""}
  </div>`;
}

/* ---------- الرسم الرئيسي: يُستدعى كل ما تغيّرت البيانات ---------- */
function render() {
  const app = document.getElementById("app");
  if (!state.user) {
    app.innerHTML = PAGES.login();
    return;
  }
  const page = PAGES[state.page] || PAGES.placeholder;
  app.innerHTML = shell(page());
}

/* ---------- زر Esc يغلق النافذة واللوحات ---------- */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.user && (state.modal || state.notifOpen)) {
    state.modal = null; state.notifOpen = false; render();
  }
});

/* ---------- التشغيل ---------- */
loadSession();
render();

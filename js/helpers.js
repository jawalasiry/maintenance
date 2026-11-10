/* =====================================================
   helpers.js  -  دوال صغيرة نستخدمها في كل الصفحات
   ===================================================== */

/* ---------- الأيقونات ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>',
  settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  check: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><polyline points="22 4 12 14 9 11"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2"/><line x1="1" y1="1" x2="23" y2="23"/>',
  arrow: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  hammer: '<path d="M14 7l3 3"/><path d="M3 21l9-9"/><path d="M11 5l4-2 6 6-2 4z"/>',
};

function icon(name) {
  return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
}

/* ---------- حماية النصوص (أي نص يكتبه المستخدم يمر من هنا) ---------- */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ---------- البحث في البيانات ---------- */
const byId = (list, id) => list.find((x) => x.id === id);
const getUser = (id) => byId(DATA.users, id);
const getUnit = (id) => byId(DATA.units, id);
const getLocation = (id) => byId(DATA.locations, id);
const getCategory = (id) => byId(DATA.categories, id);
const getRequest = (id) => byId(DATA.requests, id);

function firstName(u) { return u.name.split(" ")[0]; }

// عنوان الطلب: "مصباح تالف في الاستقبال"
function requestTitle(r) {
  const l = getLocation(r.locationId);
  const where = l ? l.name : "";
  if (r.faultType === "أخرى") return getCategory(r.category).name + ": عطل آخر في " + where;
  return r.faultType + " في " + where;
}
// سطر الموقع: "غرفة الاجتماعات — F2-MTG"
function requestLocation(r) {
  const l = getLocation(r.locationId);
  return l ? esc(l.name) + ' — <span class="ltr">' + esc(l.id) + "</span>" : "";
}

/* ---------- التواريخ (بتوقيت الرياض) ---------- */
function fmtDateTime(iso) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso)).replace(",", "");
}
function fmtDate(iso) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(iso));
}
function fmtLongDate(iso) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    timeZone: "Asia/Riyadh", weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(iso));
}

/* ---------- الشارات ---------- */
function statusBadge(r) {
  const s = DATA.statuses[r.status];
  return '<span class="badge ' + s.cls + '">' + s.name + "</span>";
}
function priorityBadge(r) {
  const p = DATA.priorities[r.priority];
  return '<span class="badge ' + p.cls + '">' + p.name + "</span>";
}
function slaBadge(r) {
  const s = DATA.slaStates[r.sla];
  return '<span class="badge ' + s.cls + '">' + s.name + "</span>";
}

/* ---------- من يشوف أي طلب؟ (حدود الاطلاع حسب الدور) ---------- */
function visibleRequests(u) {
  switch (u.role) {
    case "beneficiary": return DATA.requests.filter((r) => r.beneficiaryId === u.id);
    case "rep": return DATA.requests.filter((r) => r.unitId === u.unitId);
    case "technician": return DATA.requests.filter((r) => r.techId === u.id);
    case "coordinator":
    case "manager": return DATA.requests.slice();
    case "executive": {
      const ids = DATA.escalations.filter((e) => e.level === "executive").map((e) => e.requestId);
      return DATA.requests.filter((r) => ids.includes(r.id));
    }
    default: return []; // مدير النظام لا يرى الطلبات
  }
}

const isOpen = (r) => r.status !== "S6";
const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2 };
const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
const byPriorityThenOldest = (a, b) =>
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || new Date(a.createdAt) - new Date(b.createdAt);

// الطلبات التي "تحتاج انتباهك" حسب الدور
function attentionRequests(u) {
  const open = visibleRequests(u).filter(isOpen);
  let out = [];
  switch (u.role) {
    case "beneficiary":
    case "rep":
      out = open.filter((r) => r.status === "S5" || (r.status === "S4" && r.waitReason === "info")); break;
    case "technician":
      out = open.filter((r) => r.status === "S2" || r.status === "S3"); break;
    case "coordinator":
      out = open.filter((r) => r.status === "S1" || (r.status === "S2" && !r.techId) || r.sla === "breached"); break;
    case "manager":
      out = open.filter((r) => r.sla === "breached" || r.escalation === "open" || (r.status === "S4" && r.waitReason === "decision")); break;
  }
  return out.sort(byPriorityThenOldest);
}

// نص الإجراء الرئيسي في الصف (حسب الدور والحالة)
function actionLabel(r, u) {
  const role = u.role;
  if (role === "beneficiary") {
    if (r.status === "S5") return "تأكيد الحل";
    if (r.status === "S4" && r.waitReason === "info") return "إرسال الرد";
  }
  if (role === "coordinator" || role === "manager") {
    if (r.status === "S1") return "بدء المراجعة";
    if (r.status === "S2" && !r.techId) return "إسناد";
    if (r.status === "S3") return "متابعة التنفيذ";
    if (r.status === "S4") {
      if (r.waitReason === "parts") return "متابعة القطعة";
      if (r.waitReason === "decision") return role === "manager" ? "تسجيل القرار" : "متابعة القرار";
      return "متابعة الرد";
    }
  }
  if (role === "technician") {
    if (r.status === "S2") return "بدء العمل";
    if (r.status === "S3") return "متابعة التنفيذ";
  }
  return "عرض";
}

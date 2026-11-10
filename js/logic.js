/* =====================================================
   logic.js  -  قواعد العمل: ساعات الدوام و SLA والأولوية
   والأحداث والإشعارات والنوافذ المنبثقة
   ===================================================== */

/* ---------- ساعة العرض التجريبي ----------
   كل إجراء جديد يحرّك الساعة 3 دقائق، حتى يكون للأحداث أوقات مرتبة. */
function stamp() {
  const t = DATA.now;
  DATA.now = new Date(new Date(t).getTime() + 3 * 60000).toISOString();
  return t;
}

/* ---------- التحقق من النصوص ---------- */
// عدد المحارف الفعلية بعد إزالة الفراغات
const textLen = (s) => String(s || "").replace(/\s+/g, "").length;
// النص صالح إذا فيه على الأقل min محرف فعلي ولا يتجاوز max
const validText = (s, min, max) => textLen(s) >= min && String(s || "").trim().length <= max;

/* ---------- الأولوية المقترحة (مصفوفة الـBRD) ---------- */
const PRIORITY_MATRIX = {
  wide:   { immediate: "urgent", soon: "high",   wait: "high" },
  multi:  { immediate: "high",   soon: "high",   wait: "normal" },
  single: { immediate: "high",   soon: "normal", wait: "normal" },
};
function suggestPriority(impact, urgency, safety) {
  if (safety) return "urgent"; // خطر السلامة = عاجلة دائماً
  if (!impact || !urgency) return null;
  return PRIORITY_MATRIX[impact][urgency];
}

/* ---------- ساعات العمل (الأحد-الخميس، 08:00-16:00 بتوقيت الرياض) ---------- */
function workMinutes(fromISO, toISO) {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  if (!(to > from)) return 0;
  const OFF = 3 * 3600000; // الرياض = UTC+3 (بدون توقيت صيفي)
  const DAY = 86400000;
  let total = 0;
  for (let d = Math.floor((from + OFF) / DAY) * DAY; d < to + OFF; d += DAY) {
    const dayOfWeek = new Date(d).getUTCDay(); // 0 = الأحد
    if (!DATA.sla.workDays.includes(dayOfWeek)) continue;
    if (DATA.sla.holidays.includes(new Date(d).toISOString().slice(0, 10))) continue;
    const ws = d + DATA.sla.workStart * 3600000 - OFF;
    const we = d + DATA.sla.workEnd * 3600000 - OFF;
    const s = Math.max(ws, from);
    const e = Math.min(we, to);
    if (e > s) total += (e - s) / 60000;
  }
  return total;
}

/* ---------- حساب SLA للمعالجة ---------- */
function slaInfo(r) {
  const targetMin = DATA.sla.targets[r.priority].resolve * 60;
  const end = r.status === "S6" && r.closedAt ? r.closedAt : DATA.now;
  let used = workMinutes(r.createdAt, end);
  (r.slaPauses || []).forEach((p) => { used -= workMinutes(p.from, p.to || end); });
  used = Math.max(0, used);
  return {
    targetMin,
    usedMin: used,
    remainingMin: Math.max(0, targetMin - used),
    pct: Math.min(100, Math.round((used / targetMin) * 100)),
  };
}

function computeSlaState(r) {
  if (r.status === "S6") return r.closeType === "cancelled" || r.closeType === "duplicate" ? "na" : "done";
  if (r.status === "S5") return "paused"; // معلّق للتأكيد
  if (r.status === "S4" && (r.waitReason === "info" || r.waitReason === "parts")) return "paused";
  const i = slaInfo(r);
  if (i.usedMin > i.targetMin) return "breached";
  if (i.pct >= 80) return "near";
  return "ok";
}
const fmtHours = (min) => (min / 60).toFixed(1);

// ينهي أي فترة تعليق مفتوحة (عند الرد أو الاستمرار)
function closePauses(r, at) {
  (r.slaPauses || []).forEach((p) => { if (!p.to) p.to = at || DATA.now; });
}


/* ---------- إضافة ساعات عمل إلى وقت معيّن (لمواعيد المتابعة) ---------- */
function addWorkMinutes(startISO, minutes) {
  const OFF = 3 * 3600000;
  const DAY = 86400000;
  const t = new Date(startISO).getTime();
  let left = minutes;
  let d = Math.floor((t + OFF) / DAY) * DAY;
  for (let n = 0; n < 400 && left > 0; n++, d += DAY) {
    if (!DATA.sla.workDays.includes(new Date(d).getUTCDay())) continue;
    if (DATA.sla.holidays.includes(new Date(d).toISOString().slice(0, 10))) continue;
    const ws = d + DATA.sla.workStart * 3600000 - OFF;
    const we = d + DATA.sla.workEnd * 3600000 - OFF;
    const s = Math.max(ws, t);
    if (s >= we) continue;
    const avail = (we - s) / 60000;
    if (avail >= left) return new Date(s + left * 60000).toISOString();
    left -= avail;
  }
  return new Date(t).toISOString();
}
const addWorkHours = (iso, h) => addWorkMinutes(iso, h * 60);

// تخصص الفني المطلوب لكل فئة
const SPECIALTY_OF = { ac: "ac", lighting: "electrical", electrical: "electrical", furniture: "furniture", water: "water" };

/* ---------- السجل والإشعارات ---------- */
function addEvent(r, actorId, action, note, internal) {
  const at = stamp();
  r.history.push(ev(at, actorId, action, note, internal));
  return at; // نرجع وقت الحدث لنستخدمه في إغلاق فترات التعليق
}

let notifSeq = 100;
function notify(userIds, title, r) {
  Array.from(new Set(userIds)).filter(Boolean).forEach((uid) => {
    notifSeq += 1;
    DATA.notifications.push({ id: "n" + notifSeq, userId: uid, title: title, requestId: r.id, at: DATA.now, read: false });
  });
}
const idsOfRole = (role) => DATA.users.filter((u) => u.role === role && u.active).map((u) => u.id);

function nextRef() {
  const max = Math.max.apply(null, DATA.requests.map((r) => parseInt(r.ref.slice(-6), 10)));
  const n = max + 1;
  return { id: "r" + n, ref: "MNT-2026-" + String(n).padStart(6, "0") };
}

/* ---------- واجهة: رسالة مؤقتة ونافذة منبثقة ---------- */
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function openModal(kind, id) {
  state.modal = { kind: kind, id: id };
  render();
  setTimeout(() => {
    const f = document.querySelector(".modal textarea");
    if (f && f.focus) f.focus();
  }, 0);
}
function closeModal() { state.modal = null; render(); }

function modalShell(title, body, footer) {
  return `
  <div class="modal-back" onclick="if(event.target===this)closeModal()">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head"><h2>${title}</h2>
        <button class="icon-btn" onclick="closeModal()" aria-label="إغلاق">${icon("x")}</button></div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">${footer}</div>
    </div>
  </div>`;
}

function accessDenied() {
  return `
  <div class="card placeholder">
    <div class="stat-icon tone-red">${icon("alert")}</div>
    <h2>لا تملك صلاحية هذا الإجراء</h2>
    <p>هذا الطلب أو الصفحة غير متاحة ضمن صلاحيات حسابك.</p>
    <button class="btn btn-secondary" onclick="go('dashboard')">العودة للرئيسية</button>
  </div>`;
}

/* ---------- عند التشغيل: احسب حالة SLA لكل الطلبات ---------- */
DATA.requests.forEach((r) => { r.sla = computeSlaState(r); });

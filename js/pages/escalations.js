/* =====================================================
   pages/escalations.js  -  التصعيدات (المنسق، المدير، الإدارة العليا)
   ===================================================== */

const escState = { status: "", level: "", period: "" };

// الإدارة العليا ترى المحال إليها فقط
function visibleEscalations(u) {
  if (u.role === "executive") return DATA.escalations.filter((e) => e.level === "executive");
  if (u.role === "coordinator" || u.role === "manager") return DATA.escalations.slice();
  return [];
}
const escLate = (e) => e.status === "open" && new Date(e.dueAt) < new Date(DATA.now);

function setEscFilter(k, v) { escState[k] = v; render(); }

function escStatusBadge(e) {
  if (e.status === "ended") return '<span class="badge st-done">منتهٍ</span>';
  return escLate(e) ? '<span class="badge sla-breached">متأخر</span>' : '<span class="badge st-waiting">مفتوح</span>';
}

PAGES.escalations = function () {
  const u = state.user;
  const all = visibleEscalations(u);
  if (!all.length && !["coordinator", "manager", "executive"].includes(u.role)) return accessDenied();

  const since = escState.period ? new Date(DATA.now).getTime() - Number(escState.period) * 86400000 : 0;
  const list = all.filter((e) => {
    if (escState.status === "open" && e.status !== "open") return false;
    if (escState.status === "ended" && e.status !== "ended") return false;
    if (escState.status === "late" && !escLate(e)) return false;
    if (escState.level && e.level !== escState.level) return false;
    if (since && new Date(e.createdAt).getTime() < since) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const rows = list.map((e) => {
    const r = getRequest(e.requestId);
    return `<tr onclick="openEsc('${e.id}')">
      <td><span class="ref ltr">${r.ref}</span></td>
      <td>${DATA.escalationReasons[e.reason]}</td>
      <td>${DATA.escalationLevels[e.level]}</td>
      <td>${esc(getUser(e.ownerId).name)}</td>
      <td>${fmtDate(e.createdAt)}</td>
      <td>${fmtDateTime(e.dueAt)}</td>
      <td>${escStatusBadge(e)}</td>
      <td><button class="link" onclick="event.stopPropagation();openEsc('${e.id}')">عرض</button></td>
    </tr>`;
  }).join("");

  const cards = list.map((e) => {
    const r = getRequest(e.requestId);
    return `<div class="rcard" onclick="openEsc('${e.id}')">
      <div class="rcard-top"><span class="ref ltr">${r.ref}</span>${escStatusBadge(e)}</div>
      <div class="row-title">${DATA.escalationReasons[e.reason]} — ${DATA.escalationLevels[e.level]}</div>
      <div class="row-sub">الاستحقاق: ${fmtDateTime(e.dueAt)}</div>
    </div>`;
  }).join("");

  const sel = (key, pairs, first) =>
    `<select class="input" onchange="setEscFilter('${key}',this.value)">${optList(pairs, escState[key], first)}</select>`;

  return `
  <div class="page-head"><div>
    <h1 class="page-title">التصعيدات</h1>
    <p class="muted">متابعة القرارات والتنفيذ دون تغيير حالة طلب الصيانة تلقائياً.</p>
  </div></div>

  <div class="card toolbar-card"><div class="toolbar">
    ${sel("status", [["open", "مفتوح"], ["late", "متأخر"], ["ended", "منتهٍ"]], "كل الحالات")}
    ${sel("level", Object.keys(DATA.escalationLevels).map((k) => [k, DATA.escalationLevels[k]]), "كل المستويات")}
    ${sel("period", [["7", "آخر 7 أيام"], ["30", "آخر 30 يوماً"], ["90", "آخر 90 يوماً"]], "كل الفترات")}
  </div></div>

  ${list.length ? `
  <div class="card table-card">
    <div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th>مرجع الطلب</th><th>سبب التصعيد</th><th>المستوى</th><th>مسؤول المتابعة</th>
      <th>تاريخ الإحالة</th><th>الاستحقاق</th><th>الحالة</th><th>عرض</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div class="cards-m">${cards}</div>
  </div>` : '<div class="card empty-card"><p>لا توجد تصعيدات تطابق المرشحات</p></div>'}`;
};

/* ---------- نافذة التصعيد ---------- */
function openEsc(id) { state.modal = { kind: "esc", id: id }; render(); }

// من يسجل القرار؟ العليا لتصعيدها، والمدير لتصعيد مستواه
const canDecideEsc = (e, u) => e.status === "open" && !e.decision &&
  ((e.level === "executive" && u.role === "executive") || (e.level === "manager" && u.role === "manager"));
const canEndEsc = (e, u) => e.status === "open" && !!e.decision && u.role === "manager";

function escModal(id) {
  const e = byId(DATA.escalations, id);
  const u = state.user;
  if (!e || !visibleEscalations(u).includes(e)) return "";
  const r = getRequest(e.requestId);

  let form = "";
  if (canDecideEsc(e, u)) {
    form = `<label class="field-label" for="eDec">القرار</label>
      <textarea id="eDec" class="input ta" rows="4" placeholder="10 إلى 2000 محرف"></textarea><div id="mErr" class="field-err"></div>`;
  }
  const kv = (k, v) => `<div class="kv"><span>${k}</span><strong>${v}</strong></div>`;
  const body = `
    ${kv("الطلب", `<span class="ltr">${r.ref}</span>`)}
    ${kv("السبب", DATA.escalationReasons[e.reason])}
    ${kv("المستوى", DATA.escalationLevels[e.level])}
    ${kv("مسؤول المتابعة", esc(getUser(e.ownerId).name))}
    ${kv("تاريخ الإحالة", fmtDateTime(e.createdAt))}
    ${kv("الاستحقاق", fmtDateTime(e.dueAt))}
    ${kv("الحالة", escStatusBadge(e))}
    <div class="q-box" style="margin-top:12px"><div class="row-sub">الوصف</div>${esc(e.description)}</div>
    ${e.decision ? `<div class="q-box"><div class="row-sub">القرار</div>${esc(e.decision)}</div>` : ""}
    ${form}`;

  const foot =
    (canDecideEsc(e, u) ? `<button class="btn btn-primary" onclick="escDecide('${e.id}')">تسجيل القرار</button>` : "") +
    (canEndEsc(e, u) ? `<button class="btn btn-primary" onclick="escEnd('${e.id}')">إنهاء التصعيد بعد التنفيذ</button>` : "") +
    (u.role !== "executive" ? `<button class="btn btn-secondary" onclick="go('details',{id:'${r.id}'})">فتح الطلب</button>` : "") +
    `<button class="btn btn-secondary" onclick="closeModal()">إغلاق</button>`;
  return modalShell("تفاصيل التصعيد", body, foot);
}

function escDecide(id) {
  const e = byId(DATA.escalations, id); const u = state.user;
  if (!e || !canDecideEsc(e, u)) { toast("لا تملك صلاحية هذا الإجراء"); return; }
  const t = val("eDec").trim();
  if (!validText(t, 10, 2000)) return mErr(MSG_2000);
  const r = getRequest(e.requestId);
  e.decision = t; e.decisionBy = u.id;
  addEvent(r, u.id, "تسجيل قرار التصعيد", t, true);
  notify(idsOfRole("manager"), "تم تسجيل قرار للتصعيد المرتبط بالطلب", r);
  state.modal = null; render(); toast("تم تسجيل القرار");
}

// إنهاء التصعيد = توثيق تنفيذ القرار، ولا يغلق طلب الصيانة
function escEnd(id) {
  const e = byId(DATA.escalations, id); const u = state.user;
  if (!e || !canEndEsc(e, u)) { toast("لا تملك صلاحية هذا الإجراء"); return; }
  const r = getRequest(e.requestId);
  e.status = "ended"; e.endedAt = DATA.now;
  r.escalation = DATA.escalations.some((x) => x.requestId === r.id && x.status === "open") ? "open" : "ended";
  addEvent(r, u.id, "إنهاء التصعيد", "تم تنفيذ القرار الموثق.", true);
  state.modal = null; render(); toast("تم إنهاء التصعيد");
}

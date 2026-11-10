/* =====================================================
   pages/requests.js  -  قائمة الطلبات (طلباتي / جميع الطلبات / مهامي)
   ===================================================== */

// حالة المرشحات (تبقى محفوظة لما ترجعين من التفاصيل)
const listState = {
  q: "", status: "", category: "", floor: "", priority: "", tech: "",
  wait: "", closeType: "", sla: "", period: "", quick: "",
  more: false, perPage: 10, page: 1, sortKey: "", sortDir: "desc",
};

// القوائم السريعة
const QUICK = {
  open:       { label: "المفتوحة",     fn: (r) => isOpen(r) },
  new:        { label: "جديد",         fn: (r) => r.status === "S1" },
  reply:      { label: "تحتاج ردي",    fn: (r) => r.status === "S4" && r.waitReason === "info" },
  confirm:    { label: "تنتظر تأكيدي", fn: (r) => r.status === "S5" },
  unassigned: { label: "غير مسند",     fn: (r) => (r.status === "S1" || r.status === "S2") && !r.techId },
  breached:   { label: "متجاوز SLA",   fn: (r) => isOpen(r) && r.sla === "breached" },
  waiting:    { label: "بانتظار إجراء", fn: (r) => r.status === "S4" },
  unstarted:  { label: "غير مبدوءة",   fn: (r) => r.status === "S2" },
  progress:   { label: "قيد التنفيذ",  fn: (r) => r.status === "S3" },
};
const ROLE_QUICK = {
  beneficiary: ["open", "reply", "confirm"],
  rep: ["open", "reply", "confirm"],
  coordinator: ["open", "new", "unassigned", "breached", "waiting"],
  manager: ["open", "new", "unassigned", "breached", "waiting"],
  technician: ["open", "unstarted", "progress", "waiting"],
  executive: ["open", "breached"],
};

const isStaff = (u) => ["coordinator", "manager"].includes(u.role);
const short = (s, n) => (s.length > n ? s.slice(0, n) + "…" : s);

function resetFilters() {
  Object.assign(listState, {
    q: "", status: "", category: "", floor: "", priority: "", tech: "",
    wait: "", closeType: "", sla: "", period: "", quick: "", page: 1, sortKey: "", sortDir: "desc",
  });
}

/* ---------- التصفية والفرز ---------- */
function filteredRequests() {
  const u = state.user;
  const L = listState;
  const q = L.q.trim().toLowerCase();
  const since = L.period ? new Date(DATA.now).getTime() - Number(L.period) * 86400000 : 0;

  let list = visibleRequests(u).filter((r) => {
    if (q && !(r.ref.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.faultType.includes(q))) return false;
    if (L.status && r.status !== L.status) return false;
    if (L.category && r.category !== L.category) return false;
    if (L.floor && String(getLocation(r.locationId).floor) !== L.floor) return false;
    if (L.priority && r.priority !== L.priority) return false;
    if (L.tech && r.techId !== L.tech) return false;
    if (L.wait && !(r.status === "S4" && r.waitReason === L.wait)) return false;
    if (L.closeType && !(r.status === "S6" && r.closeType === L.closeType)) return false;
    if (L.sla && r.sla !== L.sla) return false;
    if (since && new Date(r.createdAt).getTime() < since) return false;
    if (L.quick && !QUICK[L.quick].fn(r)) return false;
    return true;
  });

  if (L.sortKey === "ref") {
    list.sort((a, b) => a.ref.localeCompare(b.ref) * (L.sortDir === "asc" ? 1 : -1));
  } else if (L.sortKey === "date") {
    list.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * (L.sortDir === "asc" ? 1 : -1));
  } else {
    list.sort(u.role === "technician" ? byPriorityThenOldest : byNewest);
  }
  return list;
}

// سطر توضيحي تحت العنوان: سبب الانتظار / تم الإسناد ولم يبدأ / اسم المستفيد للممثل
function rowHint(r, u) {
  const parts = [];
  if (r.status === "S4") parts.push(DATA.waitReasons[r.waitReason]);
  else if (r.status === "S2" && r.techId) parts.push("تم الإسناد ولم يبدأ الفني");
  if (u.role === "rep") parts.push(getUser(r.beneficiaryId).name);
  return parts.join(" • ");
}

// SLA كنص ملوّن في الجدول (مثل Figma)
function slaText(r) {
  const cls = { ok: "t-ok", near: "t-near", breached: "t-bad", paused: "t-pause", done: "t-ok", na: "muted" }[r.sla];
  return `<span class="${cls}">${DATA.slaStates[r.sla].name}</span>`;
}

/* ---------- الأعمدة حسب الدور ---------- */
function columnsFor(u) {
  const cols = [
    { h: "المرجع", sort: "ref", td: (r) => `<span class="ref ltr">${r.ref}</span>` },
    { h: "وصف مختصر", td: (r) => { const h = rowHint(r, u); return `<div class="row-title">${esc(requestTitle(r))}</div>${h ? `<div class="row-sub">${esc(h)}</div>` : ""}`; } },
    { h: "الفئة", td: (r) => esc(getCategory(r.category).name) },
    { h: "الموقع", td: (r) => requestLocation(r) },
  ];
  cols.push({ h: "الحالة", td: (r) => statusBadge(r) });
  if (isStaff(u)) cols.push({ h: "SLA", td: (r) => slaText(r) });
  if (u.role !== "beneficiary" && u.role !== "rep") cols.push({ h: "الأولوية", td: (r) => priorityBadge(r) });
  if (u.role === "technician") cols.push({ h: "موعد المتابعة", td: (r) => (r.followUpAt ? fmtDate(r.followUpAt) : "—") });
  cols.push({ h: "تاريخ التقديم", sort: "date", td: (r) => fmtDate(r.createdAt) });
  cols.push({ h: "عرض", td: (r) => `<button class="icon-btn sm" aria-label="عرض" onclick="event.stopPropagation();go('details',{id:'${r.id}'})">${icon("eye")}</button>` });
  return cols;
}

function sortArrow(key) {
  if (listState.sortKey !== key) return "";
  return listState.sortDir === "asc" ? " ▲" : " ▼";
}

/* ---------- جدول النتائج + بطاقات الجوال ---------- */
function resultsHtml() {
  const u = state.user;
  const all = filteredRequests();
  const total = all.length;
  const L = listState;
  const pages = Math.max(1, Math.ceil(total / L.perPage));
  if (L.page > pages) L.page = pages;
  const startIdx = (L.page - 1) * L.perPage;
  const pageRows = all.slice(startIdx, startIdx + L.perPage);

  if (!total) {
    const noneAtAll = visibleRequests(u).length === 0;
    return noneAtAll && (u.role === "beneficiary" || u.role === "rep")
      ? `<div class="card empty-card"><p>لم تقدم طلباً بعد</p><button class="btn btn-primary" onclick="go('newRequest',{fresh:true})">${icon("plus")} طلب جديد</button></div>`
      : `<div class="card empty-card"><p>لا توجد طلبات تطابق المرشحات</p><button class="btn btn-secondary" onclick="clearFilters()">مسح المرشحات</button></div>`;
  }

  const cols = columnsFor(u);
  const head = cols.map((c) =>
    c.sort
      ? `<th><button class="th-sort" onclick="sortBy('${c.sort}')">${c.h}${sortArrow(c.sort)}</button></th>`
      : `<th>${c.h}</th>`).join("");
  const body = pageRows.map((r) =>
    `<tr onclick="go('details',{id:'${r.id}'})">${cols.map((c) => `<td>${c.td(r)}</td>`).join("")}</tr>`).join("");

  const cards = pageRows.map((r) => `
    <div class="rcard" onclick="go('details',{id:'${r.id}'})">
      <div class="rcard-top"><span class="ref ltr">${r.ref}</span>${statusBadge(r)}</div>
      <div class="row-title">${esc(requestTitle(r))}</div>
      <div class="row-sub">${requestLocation(r)}</div>
      <div class="rcard-foot">${u.role === "beneficiary" || u.role === "rep" ? "" : priorityBadge(r)}<span class="row-sub">${fmtDate(r.createdAt)}</span></div>
    </div>`).join("");

  const from = startIdx + 1;
  const to = startIdx + pageRows.length;
  return `
  <div class="card table-card">
    <div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <div class="cards-m">${cards}</div>
    <div class="pager">
      <div class="pager-info">عرض ${from}–${to} من ${total}</div>
      <div class="pager-ctrl">
        <label class="row-sub">لكل صفحة
          <select class="input sm" onchange="setPerPage(this.value)">
            <option value="10" ${L.perPage === 10 ? "selected" : ""}>10</option>
            <option value="20" ${L.perPage === 20 ? "selected" : ""}>20</option>
          </select></label>
        <button class="btn btn-secondary sm" ${L.page <= 1 ? "disabled" : ""} onclick="setPage(${L.page - 1})">السابق</button>
        <button class="btn btn-secondary sm" ${L.page >= pages ? "disabled" : ""} onclick="setPage(${L.page + 1})">التالي</button>
      </div>
    </div>
  </div>`;
}

/* ---------- تفاعلات (تحدّث النتائج فقط حتى لا يضيع التركيز في البحث) ---------- */
function countText() { return "عرض " + filteredRequests().length + " نتيجة وفق صلاحيات الحساب الحالي."; }
function refreshList() {
  const box = document.getElementById("listResults");
  if (box) box.innerHTML = resultsHtml();
  const c = document.getElementById("countText");
  if (c) c.textContent = countText();
}
function setFilter(key, val) { listState[key] = val; listState.page = 1; refreshList(); }
function setPage(n) { listState.page = n; refreshList(); window.scrollTo(0, 0); }
function setPerPage(v) { listState.perPage = Number(v); listState.page = 1; refreshList(); }
function sortBy(key) {
  if (listState.sortKey === key) listState.sortDir = listState.sortDir === "asc" ? "desc" : "asc";
  else { listState.sortKey = key; listState.sortDir = "desc"; }
  refreshList();
}
function toggleMoreFilters() {
  listState.more = !listState.more;
  document.getElementById("morePanel").classList.toggle("hidden", !listState.more);
}
function setQuick(k) { listState.quick = listState.quick === k ? "" : k; listState.page = 1; render(); }
function clearFilters() { resetFilters(); render(); }

/* ---------- الصفحة ---------- */
const optList = (pairs, selected, first) =>
  `<option value="">${first}</option>` +
  pairs.map(([v, l]) => `<option value="${v}" ${String(selected) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("");

PAGES.requests = function () {
  const u = state.user;
  if (!NAV[u.role].some((n) => n.id === "requests")) return accessDenied(); // المدير النظام والإدارة العليا لا يرون الطلبات

  // معاملات قادمة من الرئيسية أو القائمة الجانبية
  const p = state.params || {};
  if (p.reset || p.quick) { resetFilters(); if (p.quick) listState.quick = p.quick; }
  if (p.reset || p.quick) { state.params = {}; saveSession(); }

  const L = listState;
  const staff = isStaff(u);
  const title = NAV[u.role].find((n) => n.id === "requests");
  const canCreate = u.role === "beneficiary" || u.role === "rep";

  const chips = (ROLE_QUICK[u.role] || []).map((k) =>
    `<button class="chip ${L.quick === k ? "on" : ""}" onclick="setQuick('${k}')">${QUICK[k].label}</button>`).join("");

  const techs = DATA.users.filter((x) => x.role === "technician").map((x) => [x.id, x.name]);
  const more = `
    <div id="morePanel" class="more ${L.more ? "" : "hidden"}">
      <select class="input" onchange="setFilter('floor',this.value)">${optList(DATA.floors.map((f) => [f.id, f.name]), L.floor, "كل الطوابق")}</select>
      <select class="input" onchange="setFilter('period',this.value)">${optList([["7", "آخر 7 أيام"], ["30", "آخر 30 يوماً"]], L.period, "كل الفترات")}</select>
      <select class="input" onchange="setFilter('priority',this.value)">${optList(Object.keys(DATA.priorities).map((k) => [k, DATA.priorities[k].name]), L.priority, "كل الأولويات")}</select>
      ${staff ? `<select class="input" onchange="setFilter('tech',this.value)">${optList(techs, L.tech, "كل الفنيين")}</select>` : ""}
      <select class="input" onchange="setFilter('wait',this.value)">${optList(Object.keys(DATA.waitReasons).map((k) => [k, DATA.waitReasons[k]]), L.wait, "سبب الانتظار")}</select>
      <select class="input" onchange="setFilter('closeType',this.value)">${optList(Object.keys(DATA.closeTypes).map((k) => [k, DATA.closeTypes[k]]), L.closeType, "نوع الإغلاق")}</select>
      ${staff ? `<select class="input" onchange="setFilter('sla',this.value)">${optList(Object.keys(DATA.slaStates).map((k) => [k, DATA.slaStates[k].name]), L.sla, "حالة SLA")}</select>` : ""}
    </div>`;

  return `
  <div class="page-head">
    <div>
      <h1 class="page-title">${title.label}</h1>
      <p class="muted" id="countText">${countText()}</p>
    </div>
    ${canCreate ? `<button class="btn btn-primary" onclick="go('newRequest',{fresh:true})">${icon("plus")} طلب جديد</button>` : ""}
  </div>

  <div class="card toolbar-card">
    <div class="toolbar">
      <input class="input search" type="search" placeholder="ابحث بالمرجع أو وصف المشكلة" value="${esc(L.q)}" oninput="setFilter('q',this.value)" />
      <select class="input" onchange="setFilter('status',this.value)">${optList(Object.values(DATA.statuses).map((s) => [s.code, s.name]), L.status, "كل الحالات")}</select>
      <select class="input" onchange="setFilter('category',this.value)">${optList(DATA.categories.map((c) => [c.id, c.name]), L.category, "كل الفئات")}</select>
      <button class="btn btn-secondary" onclick="toggleMoreFilters()">${icon("settings")} مرشحات إضافية</button>
    </div>
    ${more}
    <div class="chips">${chips}</div>
  </div>

  <div id="listResults">${resultsHtml()}</div>`;
};

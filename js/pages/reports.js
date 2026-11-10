/* =====================================================
   pages/reports.js  -  تقارير الخدمة (المنسق، المدير، الإدارة العليا)
   كل الأرقام تُحسب من بيانات الطلبات نفسها (نفس تعريفات الـBRD)
   ===================================================== */

const rep = { period: "30", category: "", floor: "", unit: "", tech: "" };
function setRep(k, v) { rep[k] = v; render(); }

const median = (arr) => {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// أول إجراء بشري من فريق الصيانة (مشاهدة الطلب لا تكفي)
function firstResponse(r) {
  return r.history.find((e) => {
    const a = getUser(e.actor);
    return a && ["coordinator", "manager", "technician"].includes(a.role);
  });
}

// حدود الفترة بتوقيت الرياض: من 00:00 أول يوم إلى بداية اليوم التالي (غير شاملة)
function periodBounds(days) {
  const OFF = 3 * 3600000, DAY = 86400000;
  const todayStart = Math.floor((new Date(DATA.now).getTime() + OFF) / DAY) * DAY - OFF;
  return { from: todayStart - (Number(days) - 1) * DAY, to: todayStart + DAY };
}

function reportData() {
  const b = periodBounds(rep.period);
  const inP = (iso) => { const t = new Date(iso).getTime(); return t >= b.from && t < b.to; };

  const base = DATA.requests.filter((r) =>
    (!rep.category || r.category === rep.category) &&
    (!rep.floor || String(getLocation(r.locationId).floor) === rep.floor) &&
    (!rep.unit || r.unitId === rep.unit) &&
    (!rep.tech || r.techId === rep.tech));

  const created = base.filter((r) => inP(r.createdAt));
  const openNow = base.filter(isOpen);
  const resolved = base.filter((r) => r.closeType === "confirmed" && inP(r.closedAt));
  const breachedOpen = openNow.filter((r) => r.sla === "breached");

  // التزام المعالجة: إغلاقات الحل المؤهلة (مؤكد أو تحقق إداري) التي لم تتجاوز الهدف
  const qualified = base.filter((r) => (r.closeType === "confirmed" || r.closeType === "admin") && !r.duplicateOf && inP(r.closedAt));
  const within = qualified.filter((r) => { const i = slaInfo(r); return i.usedMin <= i.targetMin; });
  const resolveRate = qualified.length ? Math.round((within.length / qualified.length) * 100) + "%" : null;
  const medProc = median(qualified.map((r) => slaInfo(r).usedMin));

  // التزام الاستجابة
  const responded = created.filter((r) => r.closeType !== "duplicate" && r.closeType !== "cancelled" && firstResponse(r));
  const respOk = responded.filter((r) => workMinutes(r.createdAt, firstResponse(r).at) <= DATA.sla.targets[r.priority].response * 60);
  const noResponse = created.filter((r) => isOpen(r) && !firstResponse(r)).length;

  const byStatus = Object.values(DATA.statuses).map((s) => ({ s: s, n: created.filter((r) => r.status === s.code).length }));
  const byCategory = DATA.categories.map((c) => ({ c: c, n: created.filter((r) => r.category === c.id && !r.duplicateOf).length }));

  return {
    openNow: openNow.length, resolved: resolved.length, breachedOpen: breachedOpen.length, resolveRate: resolveRate,
    byStatus: byStatus, byCategory: byCategory,
    admin: base.filter((r) => r.closeType === "admin" && inP(r.closedAt)).length,
    cancelled: base.filter((r) => r.closeType === "cancelled" && inP(r.closedAt)).length,
    duplicates: base.filter((r) => r.closeType === "duplicate" && inP(r.closedAt)).length,
    reopened: base.filter((r) => r.reopenCount > 0).length,
    medProc: medProc, samples: qualified.length,
    respRate: responded.length ? Math.round((respOk.length / responded.length) * 100) + "%" : null,
    respSamples: responded.length, noResponse: noResponse,
  };
}

PAGES.reports = function () {
  const u = state.user;
  if (!["coordinator", "manager", "executive"].includes(u.role)) return accessDenied();
  const d = reportData();
  const noData = '<span class="row-sub">لا توجد بيانات</span>';

  const sel = (key, pairs, first) =>
    `<select class="input" onchange="setRep('${key}',this.value)">${first ? optList(pairs, rep[key], first) : optList(pairs, rep[key], "").replace('<option value=""></option>', "")}</select>`;
  const techs = DATA.users.filter((x) => x.role === "technician").map((x) => [x.id, x.name]);

  const kpi = (value, label, icn, tone) => `
    <div class="stat nolink"><div class="stat-top">
      <div><div class="stat-num">${value}</div><div class="stat-label">${label}</div></div>
      <div class="stat-icon tone-${tone}">${icon(icn)}</div></div></div>`;

  const maxCat = Math.max(1, ...d.byCategory.map((x) => x.n));
  const catBars = d.byCategory.map((x) => `
    <div class="cat-row"><span class="cat-n">${x.n}</span>
      <div class="cat-bar"><div style="width:${(x.n / maxCat) * 100}%"></div></div>
      <span class="cat-l">${x.c.name}</span></div>`).join("");

  const statusRows = d.byStatus.map((x) =>
    `<div class="row row-static"><span class="badge ${x.s.cls}">${x.s.name}</span><strong>${x.n}</strong></div>`).join("");

  const tile = (v, l, sub) => `<div class="sum-tile"><div class="sum-v">${v}</div><div class="sum-t">${l}</div>${sub ? `<div class="row-sub">${sub}</div>` : ""}</div>`;

  return `
  <div class="page-head"><div>
    <h1 class="page-title">${u.role === "executive" ? "التقارير المختصرة" : "تقارير الخدمة"}</h1>
    <p class="muted">الفترة الافتراضية: آخر 30 يوماً. جميع القيم مشتقة من بيانات الطلبات المشتركة.</p>
  </div></div>

  <div class="card toolbar-card"><div class="toolbar">
    ${sel("period", [["7", "آخر 7 أيام"], ["30", "آخر 30 يوماً"], ["90", "آخر 90 يوماً"]])}
    ${sel("category", DATA.categories.map((c) => [c.id, c.name]), "كل الفئات")}
    ${sel("floor", DATA.floors.map((f) => [f.id, f.name]), "كل الطوابق")}
    ${sel("unit", DATA.units.map((x) => [x.id, x.name]), "كل الوحدات")}
    ${u.role !== "executive" ? sel("tech", techs, "كل الفنيين") : ""}
  </div></div>

  <div class="stats stats-4">
    ${kpi(d.openNow, "مفتوح الآن", "users", "teal")}
    ${kpi(d.resolved, "مغلق بحل", "check", "green")}
    ${kpi(d.breachedOpen, "متجاوز مفتوح", "alert", "red")}
    ${kpi(d.resolveRate || '<span class="row-sub">لا توجد بيانات</span>', "التزام المعالجة", "calendar", "teal")}
  </div>

  <div class="split">
    <section class="card"><h2 class="card-title">توزيع الحالات الست</h2>${statusRows}</section>
    <section class="card"><h2 class="card-title">الطلبات حسب الفئة</h2><div class="cat-list">${catBars}</div></section>
  </div>

  <section class="card">
    <h2 class="card-title">ملخص النتائج</h2>
    <div class="sum-tiles">
      ${tile(d.admin, "إغلاق إداري موثق")}
      ${tile(d.cancelled, "طلبات ملغاة")}
      ${tile(d.duplicates, "بلاغات مكررة")}
      ${tile(d.reopened, "طلبات أعيد فتحها")}
      ${tile(d.medProc == null ? noData : fmtHours(d.medProc) + " ساعة", "وسيط زمن المعالجة", d.samples ? "عدد العينات: " + d.samples : "")}
      ${tile(d.respRate || noData, "التزام الاستجابة", d.respSamples ? "عدد العينات: " + d.respSamples + (d.noResponse ? " • بلا استجابة: " + d.noResponse : "") : "")}
    </div>
  </section>`;
};

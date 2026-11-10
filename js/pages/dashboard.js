/* =====================================================
   pages/dashboard.js  -  الرئيسية (تختلف حسب الدور)
   ===================================================== */

/* ---------- مكونات صغيرة ---------- */

function statCard(s) {
  return `
  <div class="stat" onclick="${s.quick ? `go('requests',{quick:'${s.quick}'})` : `go('${s.page}',{reset:true})`}" role="button" tabindex="0">
    <div class="stat-top">
      <div>
        <div class="stat-num">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
      <div class="stat-icon tone-${s.tone}">${icon(s.icon)}</div>
    </div>
    <div class="stat-link">${s.linkLabel || "عرض الطلبات"} ${icon("arrow")}</div>
  </div>`;
}

// صف طلب واحد (يُستخدم هنا وفي قائمة الطلبات لاحقاً)
function requestRow(r, u) {
  return `
  <div class="row" onclick="go('details',{id:'${r.id}'})" role="button" tabindex="0">
    <div class="row-main">
      <div class="ref ltr">${r.ref}</div>
      <div class="row-title">${esc(requestTitle(r))}</div>
      <div class="row-sub">${requestLocation(r)}</div>
    </div>
    <div class="row-side">
      ${statusBadge(r)}
      ${priorityBadge(r)}
      <span class="row-action">${actionLabel(r, u)} ${icon("arrow")}</span>
    </div>
  </div>`;
}

function listCard(c) {
  const link = c.linkPage
    ? `<button class="link" onclick="go('${c.linkPage}',{reset:true})">${c.linkLabel} ${icon("arrow")}</button>`
    : "";
  const body = c.rows && c.rows.length ? c.rows.join("") : `<div class="empty">${c.empty}</div>`;
  return `
  <section class="card">
    <div class="card-head">
      <div>
        <div class="eyebrow">${c.eyebrow}</div>
        <h2 class="card-title">${c.title}</h2>
        <div class="card-sub">${c.subtitle}</div>
      </div>
      ${link}
    </div>
    ${body}
  </section>`;
}

/* ---------- محتوى الرئيسية لكل دور ---------- */

function dashConfig(u) {
  const mine = visibleRequests(u);
  const open = mine.filter(isOpen);
  const latest = mine.slice().sort(byNewest).slice(0, 5);
  const rowsOf = (list) => list.map((r) => requestRow(r, u));
  const count = (fn) => open.filter(fn).length;

  switch (u.role) {
    case "beneficiary":
    case "rep": {
      const needReply = count((r) => r.status === "S4" && r.waitReason === "info");
      const needConfirm = count((r) => r.status === "S5");
      return {
        sub: u.role === "rep"
          ? "تابع طلبات وحدتك وأرسل طلب صيانة جديداً عند الحاجة."
          : "تابع طلباتك وأرسل طلب صيانة جديداً عند الحاجة.",
        newBtn: true,
        stats: [
          { value: open.length, label: "طلبات مفتوحة", quick: "open", icon: "list", tone: "teal", page: "requests" },
          { value: needReply, label: "تحتاج رداً", quick: "reply", icon: "clock", tone: "amber", page: "requests" },
          { value: needConfirm, label: "تنتظر تأكيداً", quick: "confirm", icon: "check", tone: "blue", page: "requests" },
        ],
        lists: [
          { eyebrow: "الأولوية الآن", title: "تحتاج انتباهك", subtitle: "طلبات تنتظر منك رداً أو تأكيداً.",
            linkLabel: "عرض الكل", linkPage: "requests", rows: rowsOf(attentionRequests(u).slice(0, 5)),
            empty: "لا يوجد شيء يحتاج انتباهك الآن." },
          { eyebrow: "آخر النشاط", title: "أحدث الطلبات", subtitle: "آخر الطلبات المتاحة ضمن نطاق صلاحياتك.",
            linkLabel: "الانتقال إلى القائمة", linkPage: "requests", rows: rowsOf(latest),
            empty: "لم تقدم طلباً بعد." },
        ],
      };
    }

    case "technician":
      return {
        sub: "تابع مهامك المسندة وسجّل تقدم العمل.",
        stats: [
          { value: count((r) => r.status === "S2"), label: "غير مبدوءة", quick: "unstarted", icon: "list", tone: "gray", page: "requests", linkLabel: "عرض المهام" },
          { value: count((r) => r.status === "S3"), label: "قيد التنفيذ", quick: "progress", icon: "wrench", tone: "blue", page: "requests", linkLabel: "عرض المهام" },
          { value: count((r) => r.status === "S4"), label: "بانتظار إجراء", quick: "waiting", icon: "clock", tone: "amber", page: "requests", linkLabel: "عرض المهام" },
        ],
        lists: [
          { eyebrow: "اليوم", title: "أولويات اليوم", subtitle: "الأعلى أولوية ثم الأقدم.",
            linkLabel: "عرض الكل", linkPage: "requests", rows: rowsOf(attentionRequests(u)),
            empty: "لا توجد مهام نشطة الآن." },
          { eyebrow: "متابعة", title: "بانتظار إجراء", subtitle: "مهام متوقفة بسبب معلومات أو قطع أو قرار.",
            linkLabel: "الانتقال إلى القائمة", linkPage: "requests",
            rows: rowsOf(open.filter((r) => r.status === "S4")), empty: "لا توجد مهام متوقفة." },
        ],
      };

    case "coordinator":
    case "manager": {
      const isMgr = u.role === "manager";
      return {
        catCard: true,
        topId: (attentionRequests(u)[0] || {}).id,
        sub: isMgr
          ? "تابع الأداء والتجاوزات والقرارات المعلقة."
          : "تابع الطلبات التي تحتاج قراراً أو تدخلاً سريعاً.",
        stats: [
          { value: count((r) => r.status === "S1"), label: "جديد", quick: "new", icon: "list", tone: "gray", page: "requests" },
          { value: open.length, label: "مفتوح", quick: "open", icon: "wrench", tone: "teal", page: "requests" },
          { value: count((r) => r.sla === "breached"), label: "متجاوز SLA", quick: "breached", icon: "alert", tone: "red", page: "requests" },
          { value: count((r) => r.status === "S4"), label: "ينتظر إجراء", quick: "waiting", icon: "clock", tone: "amber", page: "requests" },
        ],
        lists: [
          { eyebrow: "الأولوية الآن", title: "تحتاج اهتماماً",
            subtitle: isMgr ? "متجاوزات وتصعيدات وقرارات معلقة." : "طلبات جديدة وغير مسندة ومتجاوزة.",
            linkLabel: "عرض الكل", linkPage: "requests", rows: rowsOf(attentionRequests(u).slice(0, 6)),
            empty: "لا يوجد شيء يحتاج اهتماماً الآن." },
          { eyebrow: "آخر النشاط", title: "أحدث الطلبات", subtitle: "آخر الطلبات المقدمة في المبنى.",
            linkLabel: "الانتقال إلى القائمة", linkPage: "requests", rows: rowsOf(latest), empty: "لا توجد طلبات." },
        ],
      };
    }

    case "executive": {
      const escs = DATA.escalations.filter((e) => e.level === "executive" && e.status === "open");
      // ملخص غير شخصي: عدد الطلبات لكل حالة، بدون أسماء
      const statusRows = Object.values(DATA.statuses).map((s) => {
        const n = DATA.requests.filter((r) => r.status === s.code).length;
        return `<div class="row row-static">
          <span class="badge ${s.cls}">${s.name}</span>
          <strong>${n}</strong>
        </div>`;
      });
      const escRows = escs.map((e) => {
        const r = getRequest(e.requestId);
        return `<div class="row" onclick="go('escalations')" role="button" tabindex="0">
          <div class="row-main">
            <div class="ref ltr">${r.ref}</div>
            <div class="row-title">تصعيد: ${DATA.escalationReasons[e.reason]}</div>
            <div class="row-sub">${esc(getCategory(r.category).name)} — ${requestLocation(r)}</div>
          </div>
          <div class="row-side">
            <span class="badge sla-near">مفتوح</span>
            <span class="row-sub">الموعد: ${fmtDate(e.dueAt)}</span>
          </div>
        </div>`;
      });
      return {
        sub: "ملخص التصعيدات المحالة إليك وحالة الطلبات.",
        stats: [
          { value: escs.length, label: "تصعيدات مفتوحة", icon: "alert", tone: "red", page: "escalations", linkLabel: "عرض التصعيدات" },
          { value: DATA.requests.filter((r) => isOpen(r) && r.sla === "breached").length, label: "متجاوزات", icon: "clock", tone: "amber", page: "reports", linkLabel: "عرض التقارير" },
          { value: DATA.requests.filter(isOpen).length, label: "طلبات مفتوحة", icon: "list", tone: "teal", page: "reports", linkLabel: "عرض التقارير" },
        ],
        lists: [
          { eyebrow: "للقرار", title: "تصعيدات مفتوحة", subtitle: "تصعيدات تنتظر قرارك.",
            linkLabel: "عرض الكل", linkPage: "escalations", rows: escRows, empty: "لا توجد تصعيدات مفتوحة." },
          { eyebrow: "ملخص", title: "الطلبات حسب الحالة", subtitle: "أرقام عامة دون بيانات شخصية.",
            rows: statusRows, empty: "" },
        ],
      };
    }

    default: { // مدير النظام
      const activeUsers = DATA.users.filter((x) => x.active).length;
      const quick = [
        { t: "المستخدمون", s: "إدارة الحسابات والأدوار", p: "users" },
        { t: "بيانات النظام", s: "الوكالات والمواقع والتصنيفات", p: "systemdata" },
        { t: "إعدادات الخدمة", s: "ساعات العمل والإجازات وأهداف الأولوية", p: "settings" },
      ].map((q) => `<div class="row" onclick="go('${q.p}')" role="button" tabindex="0">
          <div class="row-main"><div class="row-title">${q.t}</div><div class="row-sub">${q.s}</div></div>
          <span class="row-action">فتح ${icon("arrow")}</span></div>`);
      const roleRows = Object.keys(DATA.roles).map((k) => {
        const n = DATA.users.filter((x) => x.role === k && x.active).length;
        return `<div class="row row-static"><span>${DATA.roles[k]}</span><strong>${n}</strong></div>`;
      });
      return {
        sub: "أدر الحسابات والقوائم وإعدادات الخدمة.",
        stats: [
          { value: activeUsers, label: "مستخدمون نشطون", icon: "users", tone: "teal", page: "users", linkLabel: "عرض المستخدمين" },
          { value: DATA.units.length, label: "الوكالات", icon: "database", tone: "blue", page: "systemdata", linkLabel: "بيانات النظام" },
          { value: DATA.locations.length, label: "المواقع", icon: "home", tone: "gray", page: "systemdata", linkLabel: "بيانات النظام" },
        ],
        lists: [
          { eyebrow: "وصول سريع", title: "الإدارة", subtitle: "اختصارات لأهم صفحات الإدارة.", rows: quick, empty: "" },
          { eyebrow: "ملخص", title: "المستخدمون حسب الدور", subtitle: "الحسابات النشطة فقط.", rows: roleRows, empty: "" },
        ],
      };
    }
  }
}

// بطاقة "الطلبات المفتوحة حسب الفئة" (للمنسق والمدير)
function catCard() {
  const open = DATA.requests.filter(isOpen);
  const counts = DATA.categories.map((c) => ({ c: c, n: open.filter((r) => r.category === c.id).length }));
  const max = Math.max(1, ...counts.map((x) => x.n));
  return `
  <section class="card">
    <div class="eyebrow">الطلبات المفتوحة</div>
    <h2 class="card-title">حسب الفئة</h2>
    <div class="card-sub">توزيع يساعد على توجيه العمل.</div>
    <div class="cat-list">${counts.map((x) => `
      <div class="cat-row"><span class="cat-n">${x.n}</span>
        <div class="cat-bar"><div style="width:${(x.n / max) * 100}%"></div></div>
        <span class="cat-l">${x.c.name}</span></div>`).join("")}</div>
  </section>`;
}

/* ---------- الصفحة نفسها ---------- */

PAGES.dashboard = function () {
  const u = state.user;
  const c = dashConfig(u);
  const newBtn = c.newBtn
    ? `<button class="btn btn-primary" onclick="go('newRequest',{fresh:true})">${icon("plus")} طلب جديد</button>`
    : c.topId
      ? `<button class="btn btn-primary" onclick="go('details',{id:'${c.topId}'})">${icon("alert")} معالجة الطلب الأهم</button>`
      : "";

  return `
  <section class="welcome">
    <div>
      <div class="eyebrow">${icon("sparkle")} مساحة عملك اليوم</div>
      <h1 class="welcome-title">مرحباً، ${esc(firstName(u))}</h1>
      <p class="welcome-sub">${c.sub}</p>
    </div>
    <div class="welcome-side">
      <div class="date-chip">${icon("calendar")} ${fmtLongDate(DATA.now)}</div>
      ${newBtn}
    </div>
  </section>

  <section class="stats stats-${c.stats.length}">
    ${c.stats.map(statCard).join("")}
  </section>

  ${c.catCard
    ? `<div class="split">${listCard(c.lists[0])}${catCard()}</div>${c.lists.slice(1).map(listCard).join("")}`
    : c.lists.map(listCard).join("")}`;
};

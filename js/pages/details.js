/* =====================================================
   pages/details.js  -  تفاصيل الطلب + نوافذ الإجراءات
   ===================================================== */

const floorShort = (id) => byId(DATA.floors, id).name.replace("الطابق ", "");
const locDetail = (r) => { const l = getLocation(r.locationId); return floorShort(l.floor) + " · " + l.name; };
const canSeeInternal = (u) => ["coordinator", "technician", "manager"].includes(u.role);

function setTab(t) { state.params.tab = t; saveSession(); render(); }
function toggleActions() { state.actionsOpen = !state.actionsOpen; render(); }
function copyRef(ref) {
  try { navigator.clipboard.writeText(ref); } catch (e) { /* تجاهل */ }
  state.actionsOpen = false; render(); toast("تم نسخ المرجع");
}

/* ---------- مكونات ---------- */
function infoCard(title, bodyHtml) {
  return `<section class="card info-card"><h3 class="info-title">${title}</h3>${bodyHtml}</section>`;
}

function timelineHtml(events) {
  if (!events.length) return '<div class="empty">لا توجد أحداث لعرضها.</div>';
  return `<ol class="timeline">${events.map((e) => `
    <li>
      <span class="tl-dot ${e.internal ? "internal" : ""}"></span>
      <div>
        <div class="tl-action">${esc(e.action)} ${e.internal ? '<span class="badge sla-na">داخلي</span>' : ""}</div>
        <div class="tl-meta">${esc(getUser(e.actor).name)} • ${fmtDateTime(e.at)}</div>
        ${e.note ? `<div class="tl-note">${esc(e.note)}</div>` : ""}
      </div>
    </li>`).join("")}</ol>`;
}

function slaCard(r) {
  if (r.sla === "na") {
    return infoCard("اتفاقية مستوى الخدمة", '<div class="sla-state sla-na-t">غير محتسب</div><div class="row-sub">الطلبات الملغاة والمكررة لا تدخل في القياس.</div>');
  }
  const i = slaInfo(r);
  const st = DATA.slaStates[r.sla];
  const tone = { ok: "ok", done: "ok", near: "near", breached: "bad", paused: "pause", na: "pause" }[r.sla];
  const label = r.status === "S5" ? "معلّق للتأكيد" : st.name;
  const follow = r.followUpAt && r.status !== "S6"
    ? `<div class="kv"><span>المتابعة التالية</span><strong>${fmtDateTime(r.followUpAt)}</strong></div>` : "";
  return infoCard("اتفاقية مستوى الخدمة", `
    <div class="sla-top"><span class="sla-state t-${tone}">${label}</span><span>${i.pct}%</span></div>
    <div class="bar"><div class="fill f-${tone}" style="width:${i.pct}%"></div></div>
    <div class="kv"><span>الهدف</span><strong>${i.targetMin / 60} ساعة عمل</strong></div>
    <div class="kv"><span>المحتسب</span><strong>${fmtHours(i.usedMin)} ساعة عمل</strong></div>
    <div class="kv"><span>المتبقي</span><strong>${fmtHours(i.remainingMin)} ساعة</strong></div>
    ${follow}`);
}

function assignCard(r) {
  const t = r.techId ? getUser(r.techId) : null;
  const sub = t ? "الفني المسؤول حالياً" : r.status === "S6" ? "—" : "ينتظر إجراء المنسق";
  return infoCard("الإسناد", `
    <div class="assign">
      <div class="assign-ic">${icon("user")}</div>
      <div><div class="row-title">${t ? esc(t.name) : "لم يتم الإسناد"}</div><div class="row-sub">${sub}</div></div>
    </div>`);
}

/* ---------- المحتوى الرئيسي لتبويب "نظرة عامة" ---------- */
function overviewMain(r, u) {
  const out = [];
  const staffView = canSeeInternal(u);

  const imgs = (r.attachments || []).length
    ? `<div class="thumbs">${r.attachments.map((a) => `<div class="thumb"><img src="${a.url}" alt="${esc(a.name)}" /></div>`).join("")}</div>` : "";
  out.push(infoCard("وصف المشكلة", `<p>${esc(r.description)}</p>${imgs}`));

  if (r.cancelRequest) {
    out.push(infoCard("طلب إلغاء قيد الدراسة", `<p>${esc(r.cancelRequest.reason)}</p><div class="row-sub">لا تتغير حالة الطلب حتى صدور القرار.</div>`));
  }

  if (staffView && r.escalation === "open") {
    const e = DATA.escalations.find((x) => x.requestId === r.id && x.status === "open");
    if (e) out.push(infoCard("تصعيد مفتوح", `<p>${DATA.escalationReasons[e.reason]} — ${DATA.escalationLevels[e.level]}</p><div class="row-sub">الاستحقاق: ${fmtDateTime(e.dueAt)}</div><button class="link" onclick="openEsc('${e.id}')">عرض التصعيد</button>`));
  }

  if (r.status === "S4") {
    if (r.waitReason === "info") {
      out.push(infoCard("طلب معلومات إضافية", `<p>${esc(r.waitDetail)}</p>${r.followUpAt ? `<div class="row-sub">موعد المتابعة: ${fmtDateTime(r.followUpAt)}</div>` : ""}`));
    } else if (r.waitReason === "parts") {
      out.push(infoCard("بانتظار قطع غيار", `<p>${esc(r.waitDetail)}</p>${r.followUpAt ? `<div class="row-sub">موعد المتابعة: ${fmtDateTime(r.followUpAt)}</div>` : ""}`));
    } else {
      out.push(infoCard("بانتظار قرار إداري", staffView ? `<p>${esc(r.waitDetail)}</p>` : "<p>الطلب بانتظار قرار إداري، وسيتم إشعارك عند صدوره.</p>"));
    }
  }

  if (r.repair) {
    out.push(infoCard("ملخص المعالجة", `<p>${esc(r.repair)}</p><div class="row-sub">محاولات الإصلاح: ${r.repairAttempts}</div>`));
  }

  if (r.status === "S6") {
    let extra = "";
    if (r.duplicateOf) {
      const o = getRequest(r.duplicateOf);
      extra = `<div class="sim-item">الطلب الأصل: <span class="ref ltr">${o.ref}</span> ${statusBadge(o)}</div>`;
    }
    out.push(infoCard("الإغلاق", `<p><strong>${DATA.closeTypes[r.closeType]}</strong></p><p>${esc(r.closeReason || "")}</p>${extra}<div class="row-sub">${fmtDateTime(r.closedAt)}</div>`));
  }
  return out.join("");
}

/* ---------- الصفحة ---------- */
PAGES.details = function () {
  const u = state.user;
  const r = getRequest(state.params.id);
  if (!r || !visibleRequests(u).includes(r)) return accessDenied(); // منع الاطلاع عبر الرابط المباشر

  const tab = state.params.tab || "overview";
  const owner = r.beneficiaryId === u.id;

  /* الإجراء الرئيسي + قائمة المزيد (لصاحب الطلب فقط) */
  let primary = "";
  const items = [];
  if (owner && r.status === "S4" && r.waitReason === "info")
    primary = `<button class="btn btn-primary" onclick="openModal('reply','${r.id}')">إرسال التوضيح</button>`;
  if (owner && r.status === "S5")
    primary = `<button class="btn btn-primary" onclick="openModal('confirm','${r.id}')">تأكيد نتيجة الإصلاح</button>`;
  if (owner && ["S1", "S2", "S3", "S4"].includes(r.status)) {
    items.push(r.cancelRequest
      ? `<button onclick="withdrawCancel('${r.id}')">سحب طلب الإلغاء</button>`
      : `<button onclick="openModal('cancel','${r.id}')">طلب إلغاء</button>`);
  }
  // إجراءات المنسق والمدير (تظهر حسب الصلاحية والحالة)
  const sa = staffActions(r, u);
  if (sa.primary && !primary) primary = sa.primary; else if (sa.primary) items.unshift(sa.primary.replace('class="btn btn-primary" ', ""));
  sa.items.forEach((it, i) => items.splice(i, 0, it));
  items.push(`<button onclick="copyRef('${r.ref}')">نسخ المرجع</button>`);
  const menu = `
    <div class="more-wrap">
      <button class="btn btn-secondary" onclick="toggleActions()">${icon("more")} المزيد</button>
      ${state.actionsOpen ? `<div class="menu">${items.join("")}</div>` : ""}
    </div>`;

  /* بطاقة الملخص */
  const reason = r.status === "S4" ? `<span class="row-sub">سبب الانتظار: ${DATA.waitReasons[r.waitReason]}</span>`
    : r.status === "S6" ? `<span class="row-sub">${DATA.closeTypes[r.closeType]}</span>` : "";
  const extraBadges = [
    isStaff(u) || u.role === "technician" ? slaBadge(r) : "",
    r.escalation === "open" && canSeeInternal(u) ? '<span class="badge sla-breached">تصعيد مفتوح</span>' : "",
    r.cancelRequest ? '<span class="badge st-waiting">طلب إلغاء</span>' : "",
  ].join("");
  const tech = r.techId ? esc(getUser(r.techId).name) : "لم يتم الإسناد";
  const fields = [
    ["الفئة ونوع العطل", esc(getCategory(r.category).name) + " · " + esc(r.faultType)],
    ["الموقع", esc(locDetail(r))],
    ["المستفيد المسؤول", esc(getUser(r.beneficiaryId).name)],
    ["الوحدة", esc(getUnit(r.unitId).name)],
    ["تاريخ التقديم", fmtDateTime(r.createdAt)],
    ["الفني المسؤول", tech],
  ].map(([k, v]) => `<div class="f"><div class="f-k">${k}</div><div class="f-v">${v}</div></div>`).join("");

  /* التبويبات */
  const tabs = [["overview", "نظرة عامة"], ["updates", "التحديثات"], ["log", "السجل"]];
  if (canSeeInternal(u)) tabs.push(["internal", "ملاحظات داخلية"]);
  const tabsHtml = tabs.map(([k, l]) => `<button class="tab ${tab === k ? "on" : ""}" onclick="setTab('${k}')">${l}</button>`).join("");

  const visible = r.history.filter((e) => !e.internal || canSeeInternal(u));
  let body = "";
  if (tab === "overview") {
    body = `<div class="detail-grid"><div>${overviewMain(r, u)}</div><div>${assignCard(r)}${slaCard(r)}</div></div>`;
  } else if (tab === "updates") {
    const ups = visible.filter((e) => e.note && !e.internal).slice().reverse();
    body = `<section class="card">${ups.length ? timelineHtml(ups) : '<div class="empty">لا توجد تحديثات بعد.</div>'}</section>`;
  } else if (tab === "log") {
    body = `<section class="card">${timelineHtml(visible.slice().reverse())}</section>`;
  } else {
    const ints = r.history.filter((e) => e.internal).slice().reverse();
    body = `<section class="card">${ints.length ? timelineHtml(ints) : '<div class="empty">لا توجد ملاحظات داخلية.</div>'}</section>`;
  }

  const staffNote = u.role === "technician"
    ? '<div class="note-bar">إجراءات الفني (بدء العمل، الانتظار، تسجيل المعالجة) تُضاف في الخطوة القادمة.</div>'
    : u.role === "manager"
      ? '<div class="note-bar">إجراءات المنسق متاحة لك الآن. قرارات المدير (التعذر، الإغلاق الإداري، إعادة الفتح) تُضاف في الخطوة القادمة.</div>' : "";

  return `
  <div class="details-page">
    <button class="link back" onclick="go('requests')">${icon("arrow")} العودة إلى القائمة</button>
    <div class="details-head">
      <div>
        <h1 class="page-title">${esc(requestTitle(r))}</h1>
        <div class="ref ltr">${r.ref}</div>
      </div>
      <div class="head-actions">${primary}${menu}</div>
    </div>
    ${staffNote}
    <section class="card summary">
      <div class="summary-top">
        <div class="sum-r">${statusBadge(r)} ${reason}</div>
        <div class="sum-l">${priorityBadge(r)} ${extraBadges}</div>
      </div>
      <div class="summary-grid">${fields}</div>
    </section>
    <div class="tabs">${tabsHtml}</div>
    ${body}
  </div>`;
};

/* =====================================================
   النوافذ المنبثقة وإجراءات المستفيد
   ===================================================== */

function renderModal() {
  const m = state.modal;
  if (!m) return "";
  if (m.kind === "leave") return leaveModalHtml();
  if (m.kind === "esc") return escModal(m.id);
  const r = getRequest(m.id);
  if (!r) return "";
  if (m.kind.indexOf("act:") === 0) return actionModal(m.kind.slice(4), r);

  if (m.kind === "reply") {
    return modalShell("إرسال التوضيح", `
      <div class="q-box"><div class="row-sub">سؤال المنسق</div>${esc(r.waitDetail)}</div>
      <label class="field-label" for="mText">ردك</label>
      <textarea id="mText" class="input ta" rows="5" maxlength="2000" placeholder="اكتب ردك هنا (10 إلى 2000 محرف)"></textarea>
      <div id="mErr" class="field-err"></div>`,
      `<button class="btn btn-primary" onclick="submitReply('${r.id}')">إرسال الرد</button>
       <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>`);
  }

  if (m.kind === "confirm") {
    return modalShell("تأكيد نتيجة الإصلاح", `
      <div class="q-box"><div class="row-sub">ما تم تنفيذه</div>${esc(r.repair || "")}</div>
      <label class="radio"><input type="radio" name="cres" value="resolved" onchange="cresChange(this)" /> تم حل المشكلة</label>
      <label class="radio"><input type="radio" name="cres" value="persists" onchange="cresChange(this)" /> المشكلة مستمرة</label>
      <div id="persistBox" class="hidden">
        <label class="field-label" for="mText">وصف استمرار المشكلة</label>
        <textarea id="mText" class="input ta" rows="4" maxlength="2000" placeholder="اشرح ما زال لا يعمل (10 إلى 2000 محرف)"></textarea>
      </div>
      <div id="mErr" class="field-err"></div>`,
      `<button class="btn btn-primary" onclick="submitConfirm('${r.id}')">تأكيد</button>
       <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>`);
  }

  if (m.kind === "cancel") {
    return modalShell("طلب إلغاء", `
      <p class="muted">لن تتغير حالة الطلب حتى يصدر القرار.</p>
      <label class="field-label" for="mText">سبب الإلغاء</label>
      <textarea id="mText" class="input ta" rows="4" maxlength="1000" placeholder="اكتب السبب (10 إلى 1000 محرف)"></textarea>
      <div id="mErr" class="field-err"></div>`,
      `<button class="btn btn-primary" onclick="submitCancel('${r.id}')">إرسال طلب الإلغاء</button>
       <button class="btn btn-secondary" onclick="closeModal()">رجوع</button>`);
  }
  return "";
}

function cresChange(el) {
  document.getElementById("persistBox").classList.toggle("hidden", el.value !== "persists");
}
const mVal = () => { const el = document.getElementById("mText"); return el ? el.value.trim() : ""; };
const mErr = (msg) => { const e = document.getElementById("mErr"); if (e) e.textContent = msg; };
const staffAndTech = (r) => idsOfRole("coordinator").concat(r.techId ? [r.techId] : []);

// يتحقق أن المستخدم هو صاحب الطلب (الصلاحية تُفحص عند التنفيذ أيضاً)
function ownerOf(r) {
  if (r && r.beneficiaryId === state.user.id) return true;
  toast("لا تملك صلاحية هذا الإجراء");
  return false;
}

function submitReply(id) {
  const r = getRequest(id); const u = state.user;
  if (!ownerOf(r) || r.status !== "S4" || r.waitReason !== "info") return;
  const t = mVal();
  if (!validText(t, 10, 2000)) return mErr("الوصف يجب أن يكون بين 10 و2000 محرف");

  const at = addEvent(r, u.id, "رد على طلب المعلومات", t);
  closePauses(r, at);
  r.status = r.statusResume || "S2"; // يعود للحالة السابقة
  r.waitReason = null; r.waitDetail = null; r.statusResume = null; r.followUpAt = null;
  r.sla = computeSlaState(r);
  notify(staffAndTech(r), "وصل رد على التوضيح", r);
  state.modal = null; render(); toast("تم إرسال الرد بنجاح");
}

function submitConfirm(id) {
  const r = getRequest(id); const u = state.user;
  if (!ownerOf(r) || r.status !== "S5") return;
  const choice = document.querySelector('input[name="cres"]:checked');
  if (!choice) return mErr("اختر نتيجة الإصلاح");

  if (choice.value === "resolved") {
    const at = addEvent(r, u.id, "تأكيد الحل", "أكد المستفيد حل المشكلة.");
    closePauses(r, at);
    r.status = "S6"; r.closeType = "confirmed"; r.closeReason = "أكد المستفيد حل المشكلة."; r.closedAt = at;
    r.sla = computeSlaState(r);
    notify(staffAndTech(r), "أغلق الطلب: حل مؤكد", r);
    state.modal = null; render(); toast("تم تأكيد الحل وإغلاق الطلب");
  } else {
    const t = mVal();
    if (!validText(t, 10, 2000)) return mErr("الوصف يجب أن يكون بين 10 و2000 محرف");
    const techActive = r.techId && getUser(r.techId).active;
    const at = addEvent(r, u.id, "المشكلة مستمرة", t);
    closePauses(r, at); // يستأنف الحساب من حيث توقف
    r.status = techActive ? "S3" : "S2"; // نفس الفني النشط وإلا للمراجعة دون إسناد
    if (!techActive) r.techId = null;
    r.sla = computeSlaState(r);
    notify(staffAndTech(r), "المستفيد أفاد باستمرار المشكلة", r);
    state.modal = null; render(); toast("تم إبلاغ الفريق باستمرار المشكلة");
  }
}

function submitCancel(id) {
  const r = getRequest(id); const u = state.user;
  if (!ownerOf(r) || !["S1", "S2", "S3", "S4"].includes(r.status)) return;
  const t = mVal();
  if (!validText(t, 10, 1000)) return mErr("الوصف يجب أن يكون بين 10 و1000 محرف");
  r.cancelRequest = { reason: t, at: DATA.now };
  addEvent(r, u.id, "طلب إلغاء", t);
  notify(idsOfRole("coordinator"), "طلب إلغاء جديد", r);
  state.modal = null; render(); toast("تم إرسال طلب الإلغاء");
}

function withdrawCancel(id) {
  const r = getRequest(id);
  if (!ownerOf(r)) return;
  r.cancelRequest = null;
  addEvent(r, state.user.id, "سحب طلب الإلغاء", "");
  state.actionsOpen = false; render(); toast("تم سحب طلب الإلغاء");
}

/* =====================================================
   actions.js  -  إجراءات المنسق والمدير على الطلب
   كل إجراء له: صلاحية (CAN) + نافذة (body) + تنفيذ (run)
   الصلاحية تُفحص مرة عند العرض ومرة عند التنفيذ.
   ===================================================== */

const isCM = (u) => u.role === "coordinator" || u.role === "manager";
const preStart = (r) => !r.startedAt && (r.status === "S1" || r.status === "S2");

/* ---------- من يحق له ماذا؟ ---------- */
const CAN = {
  startReview: (r, u) => isCM(u) && r.status === "S1",
  assign: (r, u) => isCM(u) && r.status === "S2" && !r.techId,
  reassign: (r, u) => isCM(u) && !!r.techId && (r.status === "S2" || r.status === "S3" || (r.status === "S4" && r.waitReason !== "decision")),
  askInfo: (r, u) => isCM(u) && (r.status === "S2" || r.status === "S3"),
  priority: (r, u) => isCM(u) && ["S1", "S2", "S3", "S4"].includes(r.status),
  duplicate: (r, u) => isCM(u) && preStart(r),
  closeScope: (r, u) => isCM(u) && preStart(r),
  decideCancel: (r, u) => isCM(u) && !!r.cancelRequest && ["S1", "S2", "S3", "S4"].includes(r.status) && (u.role === "manager" || preStart(r)),
  escalate: (r, u) => isCM(u) && isOpen(r) && r.escalation !== "open",
  addNote: (r, u) => ["coordinator", "manager", "technician"].includes(u.role) && r.status !== "S6",
};

/* ---------- عناصر النماذج ---------- */
const fTextarea = (id, label, ph, rows, value) =>
  `<label class="field-label" for="${id}">${label}</label>
   <textarea id="${id}" class="input ta" rows="${rows || 4}" placeholder="${ph || ""}">${esc(value || "")}</textarea>`;
const fSelect = (id, label, pairs, sel) =>
  `<label class="field-label" for="${id}">${label}</label>
   <select id="${id}" class="input">${pairs.map(([v, l]) => `<option value="${v}" ${String(v) === String(sel) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const val = (id) => { const e = document.getElementById(id); return e ? e.value : ""; };
const FOLLOW = [["16", "خلال 16 ساعة عمل"], ["8", "خلال 8 ساعات عمل"], ["4", "خلال 4 ساعات عمل"]];
const MSG_1000 = "الوصف يجب أن يكون بين 10 و1000 محرف";
const MSG_2000 = "الوصف يجب أن يكون بين 10 و2000 محرف";

const openCount = (t) => DATA.requests.filter((x) => x.techId === t.id && isOpen(x)).length;

// الفنيون المرشحون: التخصص المناسب أولاً، والمدير يرى الجميع
function techCandidates(r, u, excludeId) {
  const spec = SPECIALTY_OF[r.category];
  const all = DATA.users.filter((x) => x.role === "technician" && x.active && x.id !== excludeId);
  const match = all.filter((x) => x.specialties.includes(spec));
  const others = all.filter((x) => !x.specialties.includes(spec));
  return u.role === "manager" ? match.concat(others) : match;
}
const techPairs = (list, spec) =>
  [["", "اختر الفني"]].concat(list.map((t) => [t.id, `${t.name} — ${openCount(t)} طلبات مفتوحة${t.specialties.includes(spec) ? "" : " (تخصص مختلف)"}`]));

/* =====================================================
   تعريف الإجراءات
   ===================================================== */
const ACTIONS = {
  startReview: {
    run(r, u) {
      addEvent(r, u.id, "بدء المراجعة");
      r.status = "S2";
      return { ok: "بدأت مراجعة الطلب" };
    },
  },

  assign: {
    title: "إسناد الطلب", label: "إسناد",
    body(r, u) {
      const list = techCandidates(r, u);
      if (!list.length) return '<p class="muted">لا يوجد فني نشط بتخصص هذه الفئة. يبقى الطلب غير مسند ويظهر لك مع استمرار SLA.</p><div id="mErr" class="field-err"></div>';
      return fSelect("aTech", "الفني", techPairs(list, SPECIALTY_OF[r.category]), "") +
        fTextarea("aNote", "ملاحظة عامة (اختياري)", "تظهر للمستفيد في سجل الطلب", 3) + '<div id="mErr" class="field-err"></div>';
    },
    run(r, u) {
      const t = getUser(val("aTech"));
      if (!t || !t.active || t.role !== "technician" || !techCandidates(r, u).some((x) => x.id === t.id)) return { err: "اختر فني صيانة نشطاً" };
      const note = val("aNote").trim();
      if (note.length > 1000) return { err: "الملاحظة يجب ألا تتجاوز 1000 محرف" };
      const at = addEvent(r, u.id, "تم إسناد الطلب إلى " + t.name, note);
      r.techId = t.id; r.assignedAt = at;
      notify([t.id], "أسند إليك الطلب " + r.ref, r);
      notify([r.beneficiaryId], "تم تعيين فني لطلبك", r);
      return { ok: "تم إسناد الطلب إلى " + t.name };
    },
  },

  reassign: {
    title: "إعادة إسناد الطلب", label: "إعادة الإسناد",
    body(r, u) {
      const list = techCandidates(r, u, r.techId);
      const warn = r.status === "S4"
        ? "سيبقى الطلب في الانتظار، وعند انتهائه يعود للمراجعة حتى يبدأ الفني البديل."
        : "سيعود الطلب إلى المراجعة حتى يبدأ الفني البديل، وتُسحب صلاحية الفني الحالي.";
      if (!list.length) return '<p class="muted">لا يوجد فني بديل متاح.</p><div id="mErr" class="field-err"></div>';
      return `<p class="muted">${warn}</p>` + fSelect("aTech", "الفني البديل", techPairs(list, SPECIALTY_OF[r.category]), "") +
        fTextarea("aReason", "سبب إعادة الإسناد", "10 إلى 1000 محرف", 3) + '<div id="mErr" class="field-err"></div>';
    },
    run(r, u) {
      const t = getUser(val("aTech"));
      if (!t || !t.active || t.role !== "technician" || t.id === r.techId || !techCandidates(r, u, r.techId).some((x) => x.id === t.id)) return { err: "اختر فني صيانة نشطاً" };
      const reason = val("aReason").trim();
      if (!validText(reason, 10, 1000)) return { err: MSG_1000 };
      const old = getUser(r.techId);
      addEvent(r, u.id, "أعيد إسناد الطلب", ""); // للمستفيد: بدون نص السبب
      const at = addEvent(r, u.id, `إعادة إسناد من ${old.name} إلى ${t.name}`, reason, true);
      r.techId = t.id; r.assignedAt = at;
      if (r.status === "S4") r.statusResume = "S2"; else r.status = "S2";
      notify([t.id], "أسند إليك الطلب " + r.ref, r);
      notify([old.id], "تم سحب الطلب " + r.ref + " منك", r);
      notify([r.beneficiaryId], "تم تعيين فني لطلبك", r);
      return { ok: "أعيد إسناد الطلب إلى " + t.name };
    },
  },

  askInfo: {
    title: "طلب توضيح من المستفيد", label: "طلب معلومات",
    body: () => fTextarea("aQ", "السؤال", "10 إلى 1000 محرف", 4) + fSelect("aFollow", "موعد المتابعة", FOLLOW, "16") + '<div id="mErr" class="field-err"></div>',
    run(r, u) {
      const q = val("aQ").trim();
      if (!validText(q, 10, 1000)) return { err: MSG_1000 };
      const prev = r.status;
      const at = addEvent(r, u.id, "طلب معلومات إضافية", q);
      r.statusResume = prev; r.status = "S4"; r.waitReason = "info"; r.waitDetail = q;
      r.followUpAt = addWorkHours(at, Number(val("aFollow")) || 16);
      r.slaPauses.push({ from: at, to: null });
      notify([r.beneficiaryId], "طلبك يحتاج معلومات إضافية", r);
      return { ok: "تم إرسال السؤال إلى المستفيد" };
    },
  },

  priority: {
    title: "تغيير الأولوية", label: "حفظ",
    body: (r) => fSelect("aPrio", "الأولوية الجديدة", Object.keys(DATA.priorities).map((k) => [k, DATA.priorities[k].name]), r.priority) +
      fTextarea("aReason", "سبب التغيير", "10 إلى 1000 محرف", 3) +
      '<p class="muted">يتغير الهدف وفق الساعات المتراكمة دون تصفيرها، ولا يُمحى أي تجاوز سابق.</p><div id="mErr" class="field-err"></div>',
    run(r, u) {
      const np = val("aPrio");
      if (!DATA.priorities[np] || np === r.priority) return { err: "اختر أولوية مختلفة" };
      const reason = val("aReason").trim();
      if (!validText(reason, 10, 1000)) return { err: MSG_1000 };
      const old = r.priority;
      addEvent(r, u.id, `تغيير الأولوية من ${DATA.priorities[old].name} إلى ${DATA.priorities[np].name}`, reason, true);
      r.priority = np;
      return { ok: "تم تغيير الأولوية" };
    },
  },

  duplicate: {
    title: "ربط كبلاغ مكرر", label: "ربط وإغلاق",
    body(r) {
      const list = originals(r);
      if (!list.length) return '<p class="muted">لا يوجد طلب أصل مفتوح لنفس الفئة والموقع.</p><div id="mErr" class="field-err"></div>';
      return fSelect("aOrig", "الطلب الأصل", [["", "اختر الطلب الأصل"]].concat(list.map((o) => [o.id, o.ref + " — " + o.faultType])), "") +
        fTextarea("aReason", "سبب التشابه", "10 إلى 1000 محرف", 3) +
        '<p class="muted">سيُغلق هذا البلاغ بنوع «مكرر مرتبط» ويصل صاحبه إشعار بنتيجة الأصل.</p><div id="mErr" class="field-err"></div>';
    },
    run(r, u) {
      const o = getRequest(val("aOrig"));
      if (!o || o.id === r.id || o.duplicateOf || !isOpen(o) || o.category !== r.category || o.locationId !== r.locationId)
        return { err: "اختر طلباً أصلياً مفتوحاً لنفس العطل والموقع" };
      const reason = val("aReason").trim();
      if (!validText(reason, 10, 1000)) return { err: MSG_1000 };
      const at = addEvent(r, u.id, "ربط كمكرر بالطلب " + o.ref, reason);
      r.duplicateOf = o.id; r.status = "S6"; r.closeType = "duplicate"; r.closeReason = reason; r.closedAt = at;
      notify([r.beneficiaryId], "أغلق الطلب: مكرر مرتبط", r);
      return { ok: "تم ربط البلاغ وإغلاقه كمكرر" };
    },
  },

  closeScope: {
    title: "إغلاق كملغى (خارج النطاق)", label: "إغلاق الطلب",
    body: () => fTextarea("aReason", "سبب الإغلاق", "", 3, "خارج نطاق الصيانة الداخلية") +
      '<p class="muted">سيُغلق الطلب بنوع «ملغى» ولا يدخل في قياس نجاح الإصلاح.</p><div id="mErr" class="field-err"></div>',
    run(r, u) {
      const reason = val("aReason").trim();
      if (!validText(reason, 10, 1000)) return { err: MSG_1000 };
      const at = addEvent(r, u.id, "إغلاق الطلب كملغى", reason);
      r.status = "S6"; r.closeType = "cancelled"; r.closeReason = reason; r.closedAt = at;
      notify([r.beneficiaryId], "أغلق الطلب: ملغى", r);
      return { ok: "تم إغلاق الطلب كملغى" };
    },
  },

  decideCancel: {
    title: "البت في طلب الإلغاء", label: "تنفيذ القرار",
    body: (r) => `<div class="q-box"><div class="row-sub">سبب المستفيد</div>${esc(r.cancelRequest.reason)}</div>
      <label class="radio"><input type="radio" name="adec" value="accept" /> قبول الإلغاء</label>
      <label class="radio"><input type="radio" name="adec" value="reject" /> رفض الإلغاء</label>` +
      fTextarea("aReason", "سبب القرار", "10 إلى 1000 محرف", 3) + '<div id="mErr" class="field-err"></div>',
    run(r, u) {
      const c = document.querySelector('input[name="adec"]:checked');
      if (!c) return { err: "اختر قبول الإلغاء أو رفضه" };
      const reason = val("aReason").trim();
      if (!validText(reason, 10, 1000)) return { err: MSG_1000 };
      if (c.value === "accept") {
        const at = addEvent(r, u.id, "قبول طلب الإلغاء", reason);
        r.cancelRequest = null; r.status = "S6"; r.closeType = "cancelled"; r.closeReason = reason; r.closedAt = at;
        notify([r.beneficiaryId], "أغلق الطلب: ملغى", r);
        return { ok: "تم قبول الإلغاء وإغلاق الطلب" };
      }
      addEvent(r, u.id, "رفض طلب الإلغاء", reason);
      r.cancelRequest = null;
      notify([r.beneficiaryId], "تم رفض طلب الإلغاء", r);
      return { ok: "تم رفض طلب الإلغاء" };
    },
  },

  escalate: {
    title: "رفع تصعيد", label: "إرسال التصعيد",
    body: (r, u) => fSelect("aEscReason", "سبب التصعيد", Object.keys(DATA.escalationReasons).map((k) => [k, DATA.escalationReasons[k]]), "delay") +
      (u.role === "manager"
        ? fSelect("aLevel", "المستوى", Object.keys(DATA.escalationLevels).map((k) => [k, DATA.escalationLevels[k]]), "manager")
        : '<label class="field-label">المستوى</label><div class="input ro">مدير الصيانة</div><input type="hidden" id="aLevel" value="manager" />') +
      fTextarea("aDesc", "الوصف", "10 إلى 2000 محرف", 4) + fSelect("aFollow", "موعد المتابعة", FOLLOW, "16") + '<div id="mErr" class="field-err"></div>',
    run(r, u) {
      const desc = val("aDesc").trim();
      if (!validText(desc, 10, 2000)) return { err: MSG_2000 };
      const level = u.role === "manager" ? val("aLevel") : "manager";
      const reason = val("aEscReason");
      const at = addEvent(r, u.id, "تم رفع تصعيد", DATA.escalationReasons[reason] + ": " + desc, true);
      const ownerId = u.role === "manager" ? u.id : idsOfRole("manager")[0];
      DATA.escalations.push({
        id: "e" + (DATA.escalations.length + 1), requestId: r.id, reason: reason, level: level,
        description: desc, ownerId: ownerId, createdBy: u.id, createdAt: at,
        dueAt: addWorkHours(at, Number(val("aFollow")) || 16), decision: null, status: "open",
      });
      r.escalation = "open";
      notify(idsOfRole("manager"), "تصعيد جديد على الطلب " + r.ref, r);
      if (level === "executive") notify(idsOfRole("executive"), "تصعيد جديد محال إليك", r);
      return { ok: "تم رفع التصعيد" };
    },
  },

  addNote: {
    title: "إضافة تحديث أو ملاحظة", label: "إضافة",
    body: (r, u) => (u.role === "technician"
        ? fSelect("aType", "النوع", [["public", "تحديث عام (يراه المستفيد)"], ["internal", "ملاحظة داخلية"]], "public")
        : fSelect("aType", "النوع", [["internal", "ملاحظة داخلية"], ["public", "تحديث عام (يراه المستفيد)"]], "internal")) +
      fTextarea("aText", "النص", "10 إلى 2000 محرف", 4) +
      '<p class="muted">لا يمكن تحويل التحديث العام إلى داخلي لاحقاً.</p><div id="mErr" class="field-err"></div>',
    run(r, u) {
      const t = val("aText").trim();
      if (!validText(t, 10, 2000)) return { err: MSG_2000 };
      const internal = val("aType") === "internal";
      addEvent(r, u.id, internal ? "ملاحظة داخلية" : "تحديث عام", t, internal);
      return { ok: internal ? "تمت إضافة الملاحظة الداخلية" : "تمت إضافة التحديث" };
    },
  },
};

// الطلبات الأصلية المرشحة للربط: مفتوحة، غير مكررة، نفس الفئة والموقع
function originals(r) {
  return DATA.requests.filter((o) => o.id !== r.id && isOpen(o) && !o.duplicateOf && o.category === r.category && o.locationId === r.locationId);
}

/* ---------- تشغيل الإجراءات ---------- */
function openAct(name, id) { state.actionsOpen = false; openModal("act:" + name, id); }

function actionModal(name, r) {
  const A = ACTIONS[name];
  if (!A) return "";
  return modalShell(A.title, A.body(r, state.user),
    `<button class="btn btn-primary" onclick="runAction('${name}','${r.id}')">${A.label}</button>
     <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>`);
}

function runAction(name, id) {
  const r = getRequest(id); const u = state.user;
  if (!r || !CAN[name] || !CAN[name](r, u)) { toast("لا تملك صلاحية هذا الإجراء"); return; }
  const res = ACTIONS[name].run(r, u);
  if (res.err) { mErr(res.err); return; }
  r.sla = computeSlaState(r);
  state.modal = null; state.actionsOpen = false; render(); toast(res.ok);
}
const doStartReview = (id) => runAction("startReview", id);

/* ---------- أزرار تفاصيل الطلب حسب الصلاحية ---------- */
function staffActions(r, u) {
  const defs = [
    ["decideCancel", "البت في طلب الإلغاء", true],
    ["startReview", "بدء المراجعة", true],
    ["assign", "إسناد", true],
    ["reassign", "إعادة الإسناد", false],
    ["askInfo", "طلب توضيح", false],
    ["priority", "تغيير الأولوية", false],
    ["duplicate", "ربط كمكرر", false],
    ["closeScope", "إغلاق كملغى (خارج النطاق)", false],
    ["escalate", "رفع تصعيد", false],
    ["addNote", "إضافة تحديث أو ملاحظة", false],
  ];
  let primary = "";
  const items = [];
  defs.forEach(([key, label, canBePrimary]) => {
    if (!CAN[key](r, u)) return;
    const fn = key === "startReview" ? `doStartReview('${r.id}')` : `openAct('${key}','${r.id}')`;
    if (canBePrimary && !primary) primary = `<button class="btn btn-primary" onclick="${fn}">${label}</button>`;
    else items.push(`<button onclick="${fn}">${label}</button>`);
  });
  return { primary: primary, items: items };
}

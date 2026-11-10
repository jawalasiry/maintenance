/* =====================================================
   data.js  -  كل البيانات الوهمية للمشروع
   (لا يوجد داتابيس: كل شيء هنا، والتعديلات تعيش في ذاكرة الصفحة)
   ===================================================== */

/* ---------- دوال مساعدة صغيرة لتقليل التكرار ---------- */

// ينشئ طلباً: القيم الافتراضية + القيم اللي نكتبها لكل طلب
const mk = (o) =>
  Object.assign(
    {
      createdBy: null,
      safety: false,
      suggestedPriority: null,
      techId: null,
      assignedAt: null,
      startedAt: null,
      waitReason: null, // info | parts | decision
      waitDetail: null,
      statusResume: null, // الحالة السابقة قبل الانتظار
      followUpAt: null,
      diagnosis: null,
      repair: null,
      repairAttempts: 0,
      closeType: null, // confirmed | admin | cancelled | duplicate
      closeReason: null,
      closedAt: null,
      duplicateOf: null,
      sla: "ok", // ok | near | breached | paused | done | na
      escalation: "none", // none | open | ended
      reopenCount: 0,
      history: [],
      slaPauses: [], // فترات تعليق SLA: [{from, to}]
      attachments: [],
      cancelRequest: null,
    },
    o
  );

// ينشئ حدثاً في سجل الطلب
const ev = (at, actor, action, note, internal) => ({
  at: at,
  actor: actor,
  action: action,
  note: note || "",
  internal: !!internal,
});

/* ---------- البيانات ---------- */

const DATA = {
  // "الآن" في العرض التجريبي ثابت (الأحد 11 أكتوبر 2026، 10:30 بتوقيت الرياض)
  now: "2026-10-11T10:30:00+03:00",

  building: "المبنى الإداري الرئيسي",

  /* ----- الأدوار ----- */
  roles: {
    beneficiary: "المستفيد",
    rep: "ممثل الوكالة",
    coordinator: "منسق الصيانة",
    technician: "فني الصيانة",
    manager: "مدير الصيانة",
    executive: "الإدارة العليا",
    admin: "مدير النظام",
  },

  /* ----- الوحدات (الوكالات) ----- */
  units: [
    { id: "un1", code: "SRV", name: "وكالة الخدمات", active: true },
    { id: "un2", code: "ADM", name: "الشؤون الإدارية", active: true },
    { id: "un3", code: "IT", name: "تقنية المعلومات", active: true },
  ],

  /* ----- المستخدمون (حسابات العرض) ----- */
  users: [
    { id: "u1", name: "جواهر الحفظي", email: "jawaher@demo.local", role: "beneficiary", unitId: "un1", specialties: [], active: true },
    { id: "u7", name: "أحمد الدوسري", email: "ahmed@demo.local", role: "beneficiary", unitId: "un2", specialties: [], active: true },
    { id: "u2", name: "سارة القحطاني", email: "sara@demo.local", role: "rep", unitId: "un2", specialties: [], active: true },
    { id: "u3", name: "منى الشهري", email: "mona@demo.local", role: "coordinator", unitId: "un1", specialties: [], active: true },
    { id: "u4", name: "عبدالله الغامدي", email: "abdullah@demo.local", role: "manager", unitId: "un1", specialties: [], active: true },
    { id: "u5", name: "محمد آل سعد", email: "mohammed@demo.local", role: "executive", unitId: "un1", specialties: [], active: true },
    { id: "u6", name: "ريم العسيري", email: "reem@demo.local", role: "admin", unitId: "un3", specialties: [], active: true },
    { id: "u8", name: "فهد الزهراني", email: "fahd@demo.local", role: "technician", unitId: "un1", specialties: ["ac"], active: true },
    { id: "u9", name: "ناصر القرني", email: "nasser@demo.local", role: "technician", unitId: "un1", specialties: ["electrical", "lighting"], active: true },
    { id: "u10", name: "يوسف البيشي", email: "yousef@demo.local", role: "technician", unitId: "un1", specialties: ["furniture"], active: true },
    { id: "u11", name: "ماجد الشهراني", email: "majed@demo.local", role: "technician", unitId: "un1", specialties: ["water"], active: true },
  ],

  /* ----- الطوابق والمواقع ----- */
  floors: [
    { id: 1, name: "الطابق الأول" },
    { id: 2, name: "الطابق الثاني" },
    { id: 3, name: "الطابق الثالث" },
  ],

  locations: [
    { id: "F1-01", floor: 1, name: "الاستقبال" },
    { id: "F1-101", floor: 1, name: "مكتب 101" },
    { id: "F1-102", floor: 1, name: "مكتب 102" },
    { id: "F1-WC", floor: 1, name: "دورة المياه" },
    { id: "F2-MTG", floor: 2, name: "غرفة الاجتماعات" },
    { id: "F2-201", floor: 2, name: "مكتب 201" },
    { id: "F2-202", floor: 2, name: "مكتب 202" },
    { id: "F2-WC", floor: 2, name: "دورة المياه" },
    { id: "F3-301", floor: 3, name: "مكتب 301" },
    { id: "F3-302", floor: 3, name: "مكتب 302" },
    { id: "F3-TR", floor: 3, name: "قاعة التدريب" },
    { id: "F3-WC", floor: 3, name: "دورة المياه" },
  ],

  /* ----- الفئات وأنواع الأعطال ----- */
  categories: [
    { id: "ac", name: "التكييف", faults: ["لا يبرد", "تسريب مياه", "صوت مزعج", "أخرى"] },
    { id: "lighting", name: "الإنارة", faults: ["مصباح تالف", "مجموعة إنارة لا تعمل", "مفتاح إنارة معطل", "أخرى"] },
    { id: "electrical", name: "الكهرباء", faults: ["مقبس معطل", "انقطاع تيار", "التماس أو رائحة احتراق", "أخرى"] },
    { id: "furniture", name: "الأثاث", faults: ["كرسي مكسور", "طاولة تالفة", "درج عالق", "أخرى"] },
    { id: "water", name: "المياه", faults: ["تسريب مغسلة", "صنبور معطل", "انسداد", "أخرى"] },
  ],

  specialties: [
    { id: "ac", name: "تكييف" },
    { id: "electrical", name: "كهرباء وإنارة" },
    { id: "furniture", name: "أثاث" },
    { id: "water", name: "مياه" },
  ],

  /* ----- قوائم ثابتة (لا تُعدّل من الإعدادات) ----- */
  // الحالات الست فقط. cls = اسم كلاس اللون في css
  statuses: {
    S1: { code: "S1", name: "جديد", cls: "st-new" },
    S2: { code: "S2", name: "قيد المراجعة", cls: "st-review" },
    S3: { code: "S3", name: "قيد التنفيذ", cls: "st-progress" },
    S4: { code: "S4", name: "بانتظار إجراء", cls: "st-waiting" },
    S5: { code: "S5", name: "تمت المعالجة", cls: "st-done" },
    S6: { code: "S6", name: "مغلق", cls: "st-closed" },
  },

  waitReasons: {
    info: "معلومات إضافية",
    parts: "قطع غيار",
    decision: "قرار إداري",
  },

  closeTypes: {
    confirmed: "حل مؤكد",
    admin: "إغلاق إداري بعد التحقق",
    cancelled: "ملغى",
    duplicate: "مكرر مرتبط",
  },

  priorities: {
    urgent: { name: "عاجلة", cls: "pr-urgent" },
    high: { name: "عالية", cls: "pr-high" },
    normal: { name: "عادية", cls: "pr-normal" },
  },

  impacts: {
    single: "مستخدم واحد أو أثر محدود",
    multi: "عدة مستخدمين أو غرفة مشتركة",
    wide: "واسع أو خطر سلامة",
  },

  urgencies: {
    immediate: "فوري",
    soon: "قريب",
    wait: "يمكن الانتظار",
  },

  slaStates: {
    ok: { name: "ضمن الهدف", cls: "sla-ok" },
    near: { name: "قريب من التجاوز", cls: "sla-near" },
    breached: { name: "متجاوز", cls: "sla-breached" },
    paused: { name: "متوقف مؤقتاً", cls: "sla-paused" },
    done: { name: "مكتمل", cls: "sla-done" },
    na: { name: "غير محتسب", cls: "sla-na" },
  },

  escalationReasons: {
    delay: "تأخر",
    unable: "تعذر",
    repeat: "تكرار",
    exception: "استثناء",
  },

  escalationLevels: {
    manager: "مدير الصيانة",
    executive: "الإدارة العليا",
  },

  /* ----- إعدادات الخدمة (SLA) - بساعات العمل ----- */
  sla: {
    timezone: "Asia/Riyadh",
    workDays: [0, 1, 2, 3, 4], // الأحد إلى الخميس
    workStart: 8,
    workEnd: 16,
    holidays: [],
    targets: {
      urgent: { response: 1, resolve: 8 },
      high: { response: 4, resolve: 16 },
      normal: { response: 8, resolve: 40 },
    },
  },

  /* ----- الطلبات الأربعة عشر ----- */
  requests: [
    // ===== جديد (2) =====
    mk({
      id: "r123", ref: "MNT-2026-000123", beneficiaryId: "u1", createdBy: "u1", unitId: "un1",
      category: "ac", faultType: "لا يبرد", locationId: "F2-201",
      description: "التكييف في مكتب 201 لا يبرد منذ الصباح ودرجة الحرارة مرتفعة داخل المكتب.",
      impact: "single", urgency: "immediate", suggestedPriority: "high", priority: "high",
      status: "S1", createdAt: "2026-10-11T08:20:00+03:00",
      history: [ev("2026-10-11T08:20:00+03:00", "u1", "تم إنشاء الطلب")],
    }),
    mk({
      id: "r124", ref: "MNT-2026-000124", beneficiaryId: "u1", createdBy: "u1", unitId: "un1",
      category: "lighting", faultType: "مصباح تالف", locationId: "F1-01",
      description: "مصباح تالف في منطقة الاستقبال ويحتاج إلى استبدال.",
      impact: "single", urgency: "wait", suggestedPriority: "normal", priority: "normal",
      status: "S1", createdAt: "2026-10-11T08:45:00+03:00",
      history: [ev("2026-10-11T08:45:00+03:00", "u1", "تم إنشاء الطلب")],
    }),

    // ===== قيد المراجعة (2): أحدهما مسند لم يبدأ، والآخر غير مسند =====
    mk({
      id: "r119", ref: "MNT-2026-000119", beneficiaryId: "u1", createdBy: "u1", unitId: "un1",
      category: "water", faultType: "تسريب مغسلة", locationId: "F1-WC",
      description: "تسريب مياه من المغسلة في دورة المياه يسبب تجمع الماء على الأرض.",
      impact: "multi", urgency: "soon", suggestedPriority: "high", priority: "high",
      status: "S2", techId: "u11", assignedAt: "2026-10-07T10:05:00+03:00",
      createdAt: "2026-10-07T09:00:00+03:00",
      sla: "breached", escalation: "open",
      history: [
        ev("2026-10-07T09:00:00+03:00", "u1", "تم إنشاء الطلب"),
        ev("2026-10-07T09:40:00+03:00", "u3", "بدء المراجعة"),
        ev("2026-10-07T10:05:00+03:00", "u3", "تم إسناد الطلب إلى ماجد الشهراني"),
        ev("2026-10-07T10:06:00+03:00", "u3", "ملاحظة داخلية", "الفني مشغول بأعمال الطابق الثالث.", true),
        ev("2026-10-11T08:00:00+03:00", "u4", "تم رفع تصعيد", "تأخر: تجاوز هدف المعالجة ولم يبدأ الفني.", true),
      ],
    }),
    mk({
      id: "r120", ref: "MNT-2026-000120", beneficiaryId: "u7", createdBy: "u7", unitId: "un2",
      category: "furniture", faultType: "درج عالق", locationId: "F1-102",
      description: "الدرج في مكتب 102 عالق ولا يفتح إلا بصعوبة.",
      impact: "single", urgency: "wait", suggestedPriority: "normal", priority: "normal",
      status: "S2", createdAt: "2026-10-11T09:10:00+03:00",
      history: [
        ev("2026-10-11T09:10:00+03:00", "u7", "تم إنشاء الطلب"),
        ev("2026-10-11T09:50:00+03:00", "u3", "بدء المراجعة"),
      ],
    }),

    // ===== قيد التنفيذ (2) =====
    mk({
      id: "r115", ref: "MNT-2026-000115", beneficiaryId: "u1", createdBy: "u1", unitId: "un1",
      category: "ac", faultType: "صوت مزعج", locationId: "F3-TR",
      description: "صوت مرتفع ومزعج من وحدة التكييف في قاعة التدريب أثناء التشغيل.",
      impact: "multi", urgency: "soon", suggestedPriority: "high", priority: "high",
      status: "S3", techId: "u8", assignedAt: "2026-10-07T13:45:00+03:00", startedAt: "2026-10-11T08:30:00+03:00",
      createdAt: "2026-10-07T13:00:00+03:00", sla: "near",
      history: [
        ev("2026-10-07T13:00:00+03:00", "u1", "تم إنشاء الطلب"),
        ev("2026-10-07T13:30:00+03:00", "u3", "بدء المراجعة"),
        ev("2026-10-07T13:45:00+03:00", "u3", "تم إسناد الطلب إلى فهد الزهراني"),
        ev("2026-10-11T08:30:00+03:00", "u8", "بدء العمل"),
      ],
    }),
    mk({
      id: "r116", ref: "MNT-2026-000116", beneficiaryId: "u7", createdBy: "u7", unitId: "un2",
      category: "electrical", faultType: "مقبس معطل", locationId: "F3-302",
      description: "المقبس الكهربائي بجانب المكتب لا يعمل ولا يشحن الأجهزة.",
      impact: "single", urgency: "soon", suggestedPriority: "normal", priority: "normal",
      status: "S3", techId: "u9", assignedAt: "2026-10-11T08:40:00+03:00", startedAt: "2026-10-11T09:00:00+03:00",
      createdAt: "2026-10-11T08:10:00+03:00",
      history: [
        ev("2026-10-11T08:10:00+03:00", "u7", "تم إنشاء الطلب"),
        ev("2026-10-11T08:25:00+03:00", "u3", "بدء المراجعة"),
        ev("2026-10-11T08:40:00+03:00", "u3", "تم إسناد الطلب إلى ناصر القرني"),
        ev("2026-10-11T09:00:00+03:00", "u9", "بدء العمل"),
      ],
    }),

    // ===== بانتظار إجراء (3): لكل سبب مثال =====
    mk({
      id: "r110", slaPauses: [{ from: "2026-10-08T11:30:00+03:00", to: null }], ref: "MNT-2026-000110", beneficiaryId: "u1", createdBy: "u1", unitId: "un1",
      category: "ac", faultType: "تسريب مياه", locationId: "F2-202",
      description: "يوجد تسريب مياه من التكييف في المكتب.",
      impact: "single", urgency: "soon", suggestedPriority: "normal", priority: "normal",
      status: "S4", techId: "u8", assignedAt: "2026-10-08T11:25:00+03:00",
      waitReason: "info", statusResume: "S2",
      waitDetail: "ما هو موقع التسريب بالضبط: من الوحدة الداخلية أم من الأنبوب؟",
      followUpAt: "2026-10-12T12:00:00+03:00",
      createdAt: "2026-10-08T11:00:00+03:00", sla: "paused",
      history: [
        ev("2026-10-08T11:00:00+03:00", "u1", "تم إنشاء الطلب"),
        ev("2026-10-08T11:20:00+03:00", "u3", "بدء المراجعة"),
        ev("2026-10-08T11:30:00+03:00", "u3", "طلب معلومات إضافية", "ما هو موقع التسريب بالضبط: من الوحدة الداخلية أم من الأنبوب؟"),
      ],
    }),
    mk({
      id: "r111", slaPauses: [{ from: "2026-10-06T13:00:00+03:00", to: null }], ref: "MNT-2026-000111", beneficiaryId: "u7", createdBy: "u7", unitId: "un2",
      category: "lighting", faultType: "مجموعة إنارة لا تعمل", locationId: "F3-301",
      description: "مجموعة الإنارة في المكتب لا تعمل بالكامل.",
      impact: "multi", urgency: "soon", suggestedPriority: "high", priority: "high",
      status: "S4", techId: "u9", assignedAt: "2026-10-06T10:00:00+03:00", startedAt: "2026-10-06T10:30:00+03:00",
      waitReason: "parts", statusResume: "S3",
      waitDetail: "محوّل إنارة (بالست) للمجموعة غير متوفر ويحتاج إلى توريد.",
      followUpAt: "2026-10-13T10:00:00+03:00",
      createdAt: "2026-10-06T09:30:00+03:00", sla: "paused",
      history: [
        ev("2026-10-06T09:30:00+03:00", "u7", "تم إنشاء الطلب"),
        ev("2026-10-06T09:45:00+03:00", "u3", "بدء المراجعة"),
        ev("2026-10-06T10:00:00+03:00", "u3", "تم إسناد الطلب إلى ناصر القرني"),
        ev("2026-10-06T10:30:00+03:00", "u9", "بدء العمل"),
        ev("2026-10-06T13:00:00+03:00", "u9", "انتظار قطع غيار", "محوّل إنارة (بالست) للمجموعة."),
      ],
    }),
    mk({
      id: "r112", ref: "MNT-2026-000112", beneficiaryId: "u7", createdBy: "u7", unitId: "un2",
      category: "electrical", faultType: "انقطاع تيار", locationId: "F1-102",
      description: "انقطاع التيار الكهربائي عن المكتب بشكل متكرر.",
      impact: "multi", urgency: "soon", suggestedPriority: "high", priority: "high",
      status: "S4", techId: "u9", assignedAt: "2026-10-07T08:40:00+03:00", startedAt: "2026-10-07T09:10:00+03:00",
      waitReason: "decision", statusResume: "S3",
      waitDetail: "تعذر الوصول للوحة الكهرباء الرئيسية. جُرّب إعادة تشغيل القاطع بدون جدوى.",
      followUpAt: "2026-10-12T09:00:00+03:00",
      createdAt: "2026-10-07T08:15:00+03:00", sla: "ok",
      history: [
        ev("2026-10-07T08:15:00+03:00", "u7", "تم إنشاء الطلب"),
        ev("2026-10-07T08:30:00+03:00", "u3", "بدء المراجعة"),
        ev("2026-10-07T08:40:00+03:00", "u3", "تم إسناد الطلب إلى ناصر القرني"),
        ev("2026-10-07T09:10:00+03:00", "u9", "بدء العمل"),
        ev("2026-10-08T10:00:00+03:00", "u9", "تعذر التنفيذ: يحتاج قراراً", "تعذر الوصول للوحة الكهرباء الرئيسية."),
      ],
    }),

    // ===== تمت المعالجة (1) =====
    mk({
      id: "r104", slaPauses: [{ from: "2026-10-08T09:30:00+03:00", to: null }], ref: "MNT-2026-000104", beneficiaryId: "u1", createdBy: "u1", unitId: "un1",
      category: "furniture", faultType: "كرسي مكسور", locationId: "F2-MTG",
      description: "كرسي مكسور في غرفة الاجتماعات ولا يصلح للجلوس.",
      impact: "single", urgency: "wait", suggestedPriority: "normal", priority: "normal",
      status: "S5", techId: "u10", assignedAt: "2026-10-06T10:35:00+03:00", startedAt: "2026-10-07T08:30:00+03:00",
      diagnosis: "كسر في قاعدة الكرسي.",
      repair: "تم استبدال القاعدة وفحص ثبات الكرسي بعد التركيب.",
      repairAttempts: 1,
      createdAt: "2026-10-06T10:00:00+03:00", sla: "paused",
      history: [
        ev("2026-10-06T10:00:00+03:00", "u1", "تم إنشاء الطلب"),
        ev("2026-10-06T10:20:00+03:00", "u3", "بدء المراجعة"),
        ev("2026-10-06T10:35:00+03:00", "u3", "تم إسناد الطلب إلى يوسف البيشي"),
        ev("2026-10-07T08:30:00+03:00", "u10", "بدء العمل"),
        ev("2026-10-08T09:30:00+03:00", "u10", "تمت المعالجة", "تم استبدال القاعدة وفحص ثبات الكرسي."),
      ],
    }),

    // ===== مغلق (4): حل مؤكد، إغلاق إداري، ملغى، مكرر =====
    mk({
      id: "r101", slaPauses: [{ from: "2026-10-04T13:00:00+03:00", to: "2026-10-05T09:00:00+03:00" }], ref: "MNT-2026-000101", beneficiaryId: "u1", createdBy: "u1", unitId: "un1",
      category: "water", faultType: "صنبور معطل", locationId: "F2-WC",
      description: "الصنبور في دورة المياه معطل ولا يغلق بإحكام.",
      impact: "single", urgency: "soon", suggestedPriority: "normal", priority: "normal",
      status: "S6", techId: "u11", assignedAt: "2026-10-04T09:00:00+03:00", startedAt: "2026-10-04T09:30:00+03:00",
      diagnosis: "تلف في خرطوشة الصنبور.", repair: "تم تغيير الخرطوشة واختبار الصنبور.", repairAttempts: 1,
      closeType: "confirmed", closeReason: "أكد المستفيد حل المشكلة.", closedAt: "2026-10-05T09:00:00+03:00",
      createdAt: "2026-10-04T08:30:00+03:00", sla: "done",
      history: [
        ev("2026-10-04T08:30:00+03:00", "u1", "تم إنشاء الطلب"),
        ev("2026-10-04T08:45:00+03:00", "u3", "بدء المراجعة"),
        ev("2026-10-04T09:00:00+03:00", "u3", "تم إسناد الطلب إلى ماجد الشهراني"),
        ev("2026-10-04T09:30:00+03:00", "u11", "بدء العمل"),
        ev("2026-10-04T13:00:00+03:00", "u11", "تمت المعالجة"),
        ev("2026-10-05T09:00:00+03:00", "u1", "تأكيد الحل", "تم إغلاق الطلب: حل مؤكد."),
      ],
    }),
    mk({
      id: "r102", slaPauses: [{ from: "2026-09-28T11:00:00+03:00", to: "2026-10-06T09:00:00+03:00" }], ref: "MNT-2026-000102", beneficiaryId: "u7", createdBy: "u7", unitId: "un2",
      category: "lighting", faultType: "مفتاح إنارة معطل", locationId: "F1-101",
      description: "مفتاح الإنارة في المكتب معطل.",
      impact: "single", urgency: "wait", suggestedPriority: "normal", priority: "normal",
      status: "S6", techId: "u9", assignedAt: "2026-09-27T09:30:00+03:00", startedAt: "2026-09-27T10:00:00+03:00",
      diagnosis: "تلف في المفتاح.", repair: "تم استبدال المفتاح.", repairAttempts: 1,
      closeType: "admin", closeReason: "تحقق المدير ميدانياً بعد 40 ساعة عمل دون تأكيد من المستفيد.",
      closedAt: "2026-10-06T09:00:00+03:00",
      createdAt: "2026-09-27T09:00:00+03:00", sla: "done", escalation: "ended",
      history: [
        ev("2026-09-27T09:00:00+03:00", "u7", "تم إنشاء الطلب"),
        ev("2026-09-27T09:30:00+03:00", "u3", "تم إسناد الطلب إلى ناصر القرني"),
        ev("2026-09-28T11:00:00+03:00", "u9", "تمت المعالجة"),
        ev("2026-10-06T09:00:00+03:00", "u4", "إغلاق إداري بعد التحقق", "تحقق ميداني من إصلاح المفتاح."),
      ],
    }),
    mk({
      id: "r105", ref: "MNT-2026-000105", beneficiaryId: "u1", createdBy: "u1", unitId: "un1",
      category: "furniture", faultType: "أخرى", locationId: "F1-101",
      description: "طلب نقل مكتب من الطابق الأول إلى الطابق الثاني.",
      impact: "single", urgency: "wait", suggestedPriority: "normal", priority: "normal",
      status: "S6", closeType: "cancelled", closeReason: "خارج نطاق الصيانة الداخلية.",
      closedAt: "2026-10-05T10:00:00+03:00",
      createdAt: "2026-10-05T09:00:00+03:00", sla: "na",
      history: [
        ev("2026-10-05T09:00:00+03:00", "u1", "تم إنشاء الطلب"),
        ev("2026-10-05T09:30:00+03:00", "u3", "بدء المراجعة"),
        ev("2026-10-05T10:00:00+03:00", "u3", "إغلاق الطلب كملغى", "خارج نطاق الصيانة الداخلية."),
      ],
    }),
    mk({
      id: "r106", ref: "MNT-2026-000106", beneficiaryId: "u7", createdBy: "u7", unitId: "un2",
      category: "ac", faultType: "صوت مزعج", locationId: "F3-TR",
      description: "صوت مزعج من التكييف في قاعة التدريب.",
      impact: "multi", urgency: "soon", suggestedPriority: "high", priority: "high",
      status: "S6", closeType: "duplicate", duplicateOf: "r115",
      closeReason: "بلاغ مكرر لنفس العطل والموقع.",
      closedAt: "2026-10-11T08:50:00+03:00",
      createdAt: "2026-10-08T15:00:00+03:00", sla: "na",
      history: [
        ev("2026-10-08T15:00:00+03:00", "u7", "تم إنشاء الطلب"),
        ev("2026-10-11T08:50:00+03:00", "u3", "ربط كمكرر بالطلب MNT-2026-000115", "نفس العطل ونفس الموقع."),
      ],
    }),
  ],

  /* ----- التصعيدات ----- */
  escalations: [
    {
      id: "e1", requestId: "r119", reason: "delay", level: "executive",
      description: "الطلب تجاوز هدف المعالجة بوضوح ولم يبدأ الفني العمل.",
      ownerId: "u4", createdBy: "u4",
      createdAt: "2026-10-11T08:00:00+03:00", dueAt: "2026-10-12T12:00:00+03:00",
      decision: null, status: "open",
    },
    {
      id: "e2", requestId: "r102", reason: "delay", level: "manager",
      description: "تأخر تأكيد المستفيد بعد المعالجة.",
      ownerId: "u4", createdBy: "u3",
      createdAt: "2026-10-02T09:00:00+03:00", dueAt: "2026-10-05T09:00:00+03:00",
      decision: "إغلاق إداري بعد التحقق الميداني.", status: "ended",
    },
  ],

  /* ----- الإشعارات ----- */
  notifications: [
    { id: "n1", userId: "u1", title: "تمت معالجة الطلب، يرجى تأكيد الحل", requestId: "r104", at: "2026-10-08T09:30:00+03:00", read: false },
    { id: "n2", userId: "u1", title: "طلبك يحتاج معلومات إضافية", requestId: "r110", at: "2026-10-08T11:30:00+03:00", read: false },
    { id: "n3", userId: "u1", title: "تم إرسال طلبك بنجاح", requestId: "r123", at: "2026-10-11T08:20:00+03:00", read: true },
    { id: "n4", userId: "u3", title: "طلب جديد يحتاج مراجعة", requestId: "r123", at: "2026-10-11T08:20:00+03:00", read: false },
    { id: "n5", userId: "u3", title: "طلب جديد يحتاج مراجعة", requestId: "r124", at: "2026-10-11T08:45:00+03:00", read: false },
    { id: "n6", userId: "u4", title: "تجاوز الهدف: الطلب MNT-2026-000119", requestId: "r119", at: "2026-10-11T08:00:00+03:00", read: false },
    { id: "n7", userId: "u4", title: "الطلب يحتاج قراراً", requestId: "r112", at: "2026-10-08T10:00:00+03:00", read: false },
    { id: "n8", userId: "u8", title: "اقترب الموعد: الطلب MNT-2026-000115", requestId: "r115", at: "2026-10-11T09:30:00+03:00", read: false },
    { id: "n9", userId: "u5", title: "تصعيد جديد محال إليك", requestId: "r119", at: "2026-10-11T08:00:00+03:00", read: false },
  ],
};

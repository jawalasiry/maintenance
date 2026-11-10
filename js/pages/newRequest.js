/* =====================================================
   pages/newRequest.js  -  نموذج طلب صيانة جديد
   ===================================================== */

let nr = null; // بيانات النموذج الحالية (تبقى حية بين إعادة الرسم)

function resetNR() {
  const u = state.user;
  nr = {
    category: "", faultType: "", floor: "", location: "", description: "",
    impact: "", urgency: "", safety: false,
    beneficiaryId: u.role === "rep" ? "" : u.id,
    images: [], imgError: "", errors: {}, dismissedSimilar: false,
    done: null, busy: false,
  };
}

const nrDirty = () =>
  nr && !nr.done && (nr.category || nr.floor || nr.description.trim() || nr.impact || nr.urgency || nr.images.length || nr.safety);

/* ---------- تغيير الحقول ---------- */
function nrSet(key, val) {
  nr[key] = key === "safety" ? !!val : val;
  if (key === "category") nr.faultType = "";
  if (key === "floor") nr.location = "";
  if (key === "category" || key === "location") nr.dismissedSimilar = false;
  delete nr.errors[key];
  render();
}

// الوصف: نحدّث العدّاد فقط (بدون إعادة رسم حتى لا يضيع المؤشر)
function nrDesc(el) {
  nr.description = el.value;
  const c = document.getElementById("descCount");
  if (c) c.textContent = el.value.length;
}

/* ---------- الصور ---------- */
function nrAddImages(input) {
  const files = Array.from(input.files || []);
  nr.imgError = "";
  for (const f of files) {
    if (!["image/jpeg", "image/png"].includes(f.type)) { nr.imgError = "النوع المقبول JPEG أو PNG"; continue; }
    if (f.size > 5 * 1024 * 1024) { nr.imgError = "هذه الصورة تتجاوز 5 ميغابايت"; continue; }
    if (nr.images.length >= 3) { nr.imgError = "يمكن إضافة 3 صور كحد أقصى في هذه العملية"; break; }
    nr.images.push({ name: f.name, url: URL.createObjectURL(f) });
  }
  input.value = "";
  render();
}
function nrRemoveImage(i) { nr.images.splice(i, 1); nr.imgError = ""; render(); }

/* ---------- الإلغاء والمغادرة ---------- */
function nrCancel() {
  if (nrDirty()) openModal("leave");
  else { nr = null; go("requests", { reset: true }); }
}
function nrLeave() { nr = null; state.modal = null; go("requests", { reset: true }); }

function leaveModalHtml() {
  return modalShell(
    "لم يتم الحفظ",
    "البيانات التي أدخلتها لن تُحفظ إذا غادرت الآن.",
    `<button class="btn btn-primary" onclick="closeModal()">متابعة التحرير</button>
     <button class="btn btn-secondary" onclick="nrLeave()">مغادرة</button>`
  );
}

/* ---------- الإرسال ---------- */
function nrSubmit() {
  if (nr.busy || nr.done) return; // يمنع تكرار الإرسال بالنقر المتكرر
  const e = {};
  if (!nr.beneficiaryId) e.beneficiaryId = "اختر المستفيد المسؤول";
  if (!nr.category) e.category = "اختر الفئة";
  if (!nr.faultType) e.faultType = "اختر نوع العطل";
  if (!nr.floor) e.floor = "اختر الطابق";
  if (!nr.location) e.location = "اختر الموقع";
  if (!validText(nr.description, 10, 2000)) e.description = "الوصف يجب أن يكون بين 10 و2000 محرف";
  if (!nr.impact) e.impact = "اختر التأثير";
  if (!nr.urgency) e.urgency = "اختر الاستعجال";
  nr.errors = e;

  if (Object.keys(e).length) {
    render();
    const f = document.querySelector(".field-err");
    if (f && f.scrollIntoView) f.scrollIntoView({ block: "center" });
    return;
  }

  nr.busy = true;
  const u = state.user;
  const bene = getUser(nr.beneficiaryId);
  const ids = nextRef();
  const prio = suggestPriority(nr.impact, nr.urgency, nr.safety);
  const at = stamp();

  const r = mk({
    id: ids.id, ref: ids.ref, beneficiaryId: bene.id, createdBy: u.id, unitId: bene.unitId,
    category: nr.category, faultType: nr.faultType, locationId: nr.location,
    description: nr.description.trim(), impact: nr.impact, urgency: nr.urgency, safety: nr.safety,
    suggestedPriority: prio, priority: prio, status: "S1", createdAt: at,
    attachments: nr.images.map((i) => ({ name: i.name, url: i.url })),
  });
  r.history.push(ev(at, u.id, "تم إنشاء الطلب"));
  DATA.requests.push(r);
  r.sla = computeSlaState(r);

  notify(idsOfRole("coordinator"), "طلب جديد يحتاج مراجعة", r);
  notify([bene.id], "تم إرسال طلبك بنجاح", r);

  nr.done = { id: r.id, ref: r.ref };
  nr.busy = false;
  render();
}

/* ---------- الواجهة ---------- */
function nrField(key, label, inner) {
  return `<div class="fld"><label class="field-label">${label}</label>${inner}${
    nr.errors[key] ? `<div class="field-err">${nr.errors[key]}</div>` : ""}</div>`;
}
function nrSelect(key, pairs, val, placeholder, disabled) {
  return `<select class="input ${nr.errors[key] ? "bad" : ""}" ${disabled ? "disabled" : ""} onchange="nrSet('${key}',this.value)">${optList(pairs, val, placeholder)}</select>`;
}

function similarBox() {
  if (!nr.category || !nr.location || nr.dismissedSimilar) return "";
  const list = DATA.requests.filter((r) => isOpen(r) && !r.duplicateOf && r.category === nr.category && r.locationId === nr.location);
  if (!list.length) return "";
  const items = list.map((r) =>
    `<div class="sim-item"><span class="ref ltr">${r.ref}</span> ${statusBadge(r)} <span class="row-sub">${esc(r.faultType)}</span></div>`).join("");
  return `
  <div class="sim-box">
    <strong>${icon("alert")} يوجد طلب مشابه مفتوح لنفس الفئة والموقع</strong>
    <div class="row-sub">قد يكون البلاغ مكرراً. راجع الطلبات التالية قبل الإرسال:</div>
    ${items}
    <button type="button" class="btn btn-secondary sm" onclick="nrDismissSimilar()">متابعة إنشاء بلاغ مختلف</button>
  </div>`;
}
function nrDismissSimilar() { nr.dismissedSimilar = true; render(); }

function nrSuccess() {
  return `
  <div class="card success-card">
    <div class="stat-icon tone-green">${icon("check")}</div>
    <h2>تم إرسال طلبك بنجاح</h2>
    <p class="muted">رقم المرجع: <strong class="ltr">${nr.done.ref}</strong></p>
    <div class="success-actions">
      <button class="btn btn-primary" onclick="nrOpenCreated()">عرض الطلب</button>
      <button class="btn btn-secondary" onclick="go('newRequest',{fresh:true})">طلب جديد آخر</button>
    </div>
  </div>`;
}
function nrOpenCreated() { const id = nr.done.id; nr = null; go("details", { id: id }); }

PAGES.newRequest = function () {
  const u = state.user;
  if (u.role !== "beneficiary" && u.role !== "rep") return accessDenied();
  if (state.params.fresh || !nr) { resetNR(); state.params = {}; saveSession(); }
  if (nr.done) return nrSuccess();

  const cat = nr.category ? getCategory(nr.category) : null;
  const faults = cat ? cat.faults.map((f) => [f, f]) : [];
  const locs = DATA.locations.filter((l) => String(l.floor) === String(nr.floor)).map((l) => [l.id, l.name]);
  const prio = suggestPriority(nr.impact, nr.urgency, nr.safety);
  const unit = getUnit(u.unitId);

  // المستفيد المسؤول: ثابت للمستفيد، قائمة من الوحدة للممثل
  const beneField = u.role === "rep"
    ? nrField("beneficiaryId", "المستفيد المسؤول",
        nrSelect("beneficiaryId",
          DATA.users.filter((x) => x.active && x.unitId === u.unitId && (x.role === "beneficiary" || x.id === u.id)).map((x) => [x.id, x.name]),
          nr.beneficiaryId, "اختر المستفيد"))
    : nrField("beneficiaryId", "المستفيد المسؤول", `<div class="input ro">${esc(u.name)}</div>`);

  const thumbs = nr.images.map((im, i) => `
    <div class="thumb"><img src="${im.url}" alt="${esc(im.name)}" />
      <button type="button" class="thumb-x" onclick="nrRemoveImage(${i})" aria-label="حذف الصورة">${icon("x")}</button></div>`).join("");

  return `
  <div class="form-page">
    <h1 class="page-title">طلب صيانة جديد</h1>
    <p class="muted">أدخل تفاصيل المشكلة بوضوح لتسهيل المراجعة والإسناد.</p>

    <section class="card">
      <h2 class="card-title">معلومات مقدم الطلب</h2>
      <div class="grid2">
        ${nrField("x1", "مقدم الطلب", `<div class="input ro">${esc(u.name)}</div>`)}
        ${nrField("x2", "الوكالة أو الوحدة", `<div class="input ro">${esc(unit.name)}</div>`)}
        ${beneField}
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">تفاصيل العطل</h2>
      <div class="grid2">
        ${nrField("category", "الفئة", nrSelect("category", DATA.categories.map((c) => [c.id, c.name]), nr.category, "اختر الفئة"))}
        ${nrField("faultType", "نوع العطل", nrSelect("faultType", faults, nr.faultType, "اختر نوع العطل", !cat))}
        ${nrField("floor", "الطابق", nrSelect("floor", DATA.floors.map((f) => [f.id, f.name]), nr.floor, "اختر الطابق"))}
        ${nrField("location", "الغرفة أو المنطقة", nrSelect("location", locs, nr.location, "اختر الموقع", !nr.floor))}
      </div>
      ${similarBox()}
      <div class="fld">
        <label class="field-label" for="desc">وصف المشكلة</label>
        <textarea id="desc" class="input ta ${nr.errors.description ? "bad" : ""}" rows="4" maxlength="2000"
          placeholder="صف ما يحدث وما يلزم أن يعرفه فريق الصيانة" oninput="nrDesc(this)">${esc(nr.description)}</textarea>
        <div class="row-sub"><span id="descCount">${nr.description.length}</span> / 2000</div>
        ${nr.errors.description ? `<div class="field-err">${nr.errors.description}</div>` : ""}
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">الأثر والأولوية</h2>
      <div class="grid2">
        ${nrField("impact", "التأثير", nrSelect("impact", Object.keys(DATA.impacts).map((k) => [k, DATA.impacts[k]]), nr.impact, "اختر التأثير"))}
        ${nrField("urgency", "الاستعجال", nrSelect("urgency", Object.keys(DATA.urgencies).map((k) => [k, DATA.urgencies[k]]), nr.urgency, "اختر الاستعجال"))}
        <label class="check-box">
          <input type="checkbox" ${nr.safety ? "checked" : ""} onchange="nrSet('safety',this.checked)" />
          <span><strong>يوجد خطر سلامة</strong><div class="row-sub">يفرض أولوية عاجلة</div></span>
        </label>
        <div class="prio-box">
          <div class="row-sub">الأولوية المقترحة</div>
          ${prio ? `<span class="badge lg ${DATA.priorities[prio].cls}">${DATA.priorities[prio].name}</span>` : '<span class="row-sub">اختر التأثير والاستعجال</span>'}
        </div>
      </div>
      ${nr.safety ? `<div class="safety-alert">${icon("alert")} أبلغ مسؤول السلامة فوراً. هذا النظام ليس قناة طوارئ.</div>` : ""}
    </section>

    <section class="card">
      <h2 class="card-title">الصور</h2>
      <p class="muted">اختياري، حتى 3 صور JPEG أو PNG، بحد أقصى 5 ميغابايت للصورة.</p>
      <div class="thumbs">${thumbs}</div>
      ${nr.imgError ? `<div class="field-err">${nr.imgError}</div>` : ""}
      <input id="imgInput" type="file" accept="image/jpeg,image/png" multiple class="hidden" onchange="nrAddImages(this)" />
      <button type="button" class="btn btn-secondary" onclick="document.getElementById('imgInput').click()">${icon("plus")} إضافة صور</button>
    </section>

    <div class="card form-actions">
      <button class="btn btn-primary" onclick="nrSubmit()">إرسال الطلب</button>
      <button class="btn btn-secondary" onclick="nrCancel()">إلغاء</button>
    </div>
  </div>`;
};

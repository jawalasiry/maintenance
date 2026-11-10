/* =====================================================
   pages/login.js  -  صفحة الدخول
   ===================================================== */

// كلمة مرور موحدة لحسابات العرض الوهمية فقط
const DEMO_PASSWORD = "Demo@123456";

PAGES.login = function () {
  const demoButtons = DATA.users
    .filter((u) => u.active)
    .map(
      (u) => `
      <button type="button" class="demo-btn" onclick="login('${u.id}')">
        <div class="demo-name">${esc(u.name)}</div>
        <div class="demo-role">${DATA.roles[u.role]}</div>
      </button>`
    )
    .join("");

  return `
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-logo">${icon("wrench")}</div>
        <div>
          <div class="login-title">نظام إدارة طلبات الصيانة</div>
          <div class="login-sub">الصيانة الداخلية • نسخة تجريبية</div>
        </div>
      </div>

      <form onsubmit="doLogin(event)" autocomplete="off">
        <label class="field-label" for="email">البريد الإلكتروني</label>
        <input id="email" class="input ltr" type="email" placeholder="name@demo.local" />

        <label class="field-label" for="password">كلمة المرور</label>
        <div class="pw">
          <input id="password" class="input ltr" type="password" />
          <button type="button" class="pw-toggle" id="pwBtn" onclick="togglePw()" aria-label="إظهار أو إخفاء كلمة المرور">${icon("eye")}</button>
        </div>

        <div id="loginError" class="form-error" role="alert"></div>
        <button class="btn btn-primary btn-block" type="submit">دخول</button>
      </form>

      <button type="button" class="link help-link" onclick="toggleLoginHelp()">مساعدة الدخول</button>
      <div id="loginHelp" class="help-text hidden">
        لا توجد استعادة بالبريد في هذا الإصدار. لإعادة تعيين كلمة المرور تواصل مع مسؤول النظام.
      </div>

      <div class="demo">
        <div class="demo-title">حسابات العرض التجريبي</div>
        <div class="demo-note">اضغطي على أي حساب للدخول مباشرة. كلمة المرور لكل الحسابات: <span class="ltr">${DEMO_PASSWORD}</span></div>
        <div class="demo-grid">${demoButtons}</div>
      </div>
    </div>
  </div>`;
};

function doLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const pw = document.getElementById("password").value;
  const user = DATA.users.find((u) => u.email.toLowerCase() === email && u.active);

  if (user && pw === DEMO_PASSWORD) {
    login(user.id);
  } else {
    // رسالة موحدة لا تكشف أي الحقلين خاطئ (حسب الـBRD)
    document.getElementById("loginError").textContent =
      "تعذر تسجيل الدخول؛ تحقق من البيانات أو تواصل مع مسؤول النظام";
  }
}

function togglePw() {
  const input = document.getElementById("password");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  document.getElementById("pwBtn").innerHTML = icon(show ? "eyeOff" : "eye");
}

function toggleLoginHelp() {
  document.getElementById("loginHelp").classList.toggle("hidden");
}

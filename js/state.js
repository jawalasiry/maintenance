/* =====================================================
   state.js  -  "الذاكرة": من المستخدم الحالي؟ أي صفحة مفتوحة؟
   ===================================================== */

// كل صفحة تسجل نفسها هنا، مثال: PAGES.dashboard = function () { ... }
const PAGES = {};

const state = {
  user: null,        // المستخدم المسجّل حالياً
  page: "dashboard", // الصفحة المفتوحة
  params: {},        // معلومات إضافية للصفحة (مثل رقم الطلب)
  notifOpen: false,  // هل لوحة الإشعارات مفتوحة؟
  menuOpen: false,   // هل القائمة الجانبية مفتوحة (على الجوال)؟
  modal: null,       // النافذة المنبثقة المفتوحة { kind, id }
  actionsOpen: false, // قائمة "المزيد" في تفاصيل الطلب
};

/* حفظ الجلسة في المتصفح عشان التحديث (F5) ما يطلعك من الحساب.
   نحفظ فقط رقم المستخدم والصفحة، ولا نحفظ كلمات مرور. */
function saveSession() {
  try {
    sessionStorage.setItem(
      "mnt_session",
      JSON.stringify({ uid: state.user ? state.user.id : null, page: state.page, params: state.params })
    );
  } catch (e) { /* تجاهل */ }
}

function loadSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem("mnt_session") || "null");
    if (s && s.uid) {
      const u = DATA.users.find((x) => x.id === s.uid && x.active);
      if (u) {
        state.user = u;
        state.page = s.page || "dashboard";
        state.params = s.params || {};
      }
    }
  } catch (e) { /* تجاهل */ }
}

function login(userId) {
  state.user = DATA.users.find((u) => u.id === userId);
  state.page = "dashboard";
  state.params = {};
  state.notifOpen = false;
  state.menuOpen = false;
  saveSession();
  render();
}

function logout() {
  state.user = null;
  state.notifOpen = false;
  state.menuOpen = false;
  try { sessionStorage.removeItem("mnt_session"); } catch (e) { /* تجاهل */ }
  render();
}

// الانتقال بين الصفحات
function go(page, params) {
  state.page = page;
  state.params = params || {};
  state.notifOpen = false;
  state.menuOpen = false;
  state.modal = null;
  state.actionsOpen = false;
  saveSession();
  render();
  window.scrollTo(0, 0);
}

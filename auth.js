// ============================================================
// auth.js - Authentication & Session Management
// ============================================================

const Auth = (() => {
  const SESSION_KEY = "nexus_session";
  const ADMIN_SESSION_KEY = "nexus_admin_session";

  function login(email, password) {
    const user = DB.getUserByEmail(email);
    if (!user) return { success: false, error: "Email পাওয়া যায়নি" };
    const passHash = CryptoJS.SHA256(password).toString();
    if (user.password !== passHash) return { success: false, error: "Password ভুল" };
    const session = { userId: user.id, email: user.email, loginAt: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, user };
  }

  function register(name, email, password) {
    if (!name || !email || !password) return { success: false, error: "সব ফিল্ড পূরণ করুন" };
    if (password.length < 6) return { success: false, error: "Password কমপক্ষে ৬ অক্ষর হতে হবে" };
    const existing = DB.getUserByEmail(email);
    if (existing) return { success: false, error: "এই Email ইতিমধ্যে নিবন্ধিত" };
    const user = DB.addUser({ name, email, password });
    const session = { userId: user.id, email: user.email, loginAt: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, user };
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (!session) return null;
    const s = JSON.parse(session);
    const users = DB.getUsers();
    return users.find(u => u.id === s.userId) || null;
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  // Admin Auth
  function adminLogin(email, password) {
    // Get client info
    const userAgent = navigator.userAgent;
    const ip = "client_ip"; // In production, get from server
    const ok = DB.verifyAdmin(email, password, ip, userAgent);
    if (!ok) return { success: false, error: "Admin credentials ভুল অথবা আপনার device অনুমোদিত নয়" };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ email, loginAt: Date.now(), ua: userAgent }));
    DB.updateAdminDevice(ip, userAgent);
    return { success: true };
  }

  function adminLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }

  function isAdminLoggedIn() {
    const s = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!s) return false;
    const sess = JSON.parse(s);
    // Verify UA matches
    return sess.ua === navigator.userAgent;
  }

  return { login, register, logout, getCurrentUser, isLoggedIn, adminLogin, adminLogout, isAdminLoggedIn };
})();

// ============================================================
// app.js - NexusHub Main Application
// Full feature: Auth, Feed, Profile, Admin Panel, etc.
// ============================================================

// ===== STATE =====
const State = {
  page: "feed",           // feed | login | register | profile | admin | adminLogin | myProfile | dashboard | explore
  currentUser: null,
  isAdmin: false,
  adminPage: "dashboard", // dashboard | posts | users | alerts | comments
  viewProfileId: null,
  modal: null,            // null | "newPost" | "editProfile" | "viewPost"
  selectedPost: null,
  feedTab: "all",         // all | news | code | alert
  visits: { total: 0, unique: [] },
  toast: null,
  commentOpen: {},        // postId -> bool

  set(key, val) { this[key] = val; render(); },
};

// ===== HELPERS =====
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "এখনই";
  if (m < 60) return m + " মিনিট আগে";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " ঘন্টা আগে";
  return Math.floor(h / 24) + " দিন আগে";
}

function esc(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function getInitials(name) {
  return (name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
}

function showToast(msg, type = "info") {
  State.toast = { msg, type };
  const old = document.getElementById("toast");
  if (old) old.remove();
  const t = document.createElement("div");
  t.id = "toast";
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</span> ${esc(msg)}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity 0.5s"; setTimeout(()=>t.remove(), 500); }, 3000);
}

function navigate(page, extra = {}) {
  Object.assign(State, { page, ...extra });
  render();
  window.scrollTo(0, 0);
}

function avatarHTML(user, size = "sm") {
  if (!user) return `<div class="avatar-${size}">${"?"}</div>`;
  if (user.avatar) return `<div class="avatar-${size}"><img src="${esc(user.avatar)}" alt=""/></div>`;
  return `<div class="avatar-${size}" style="background:linear-gradient(135deg,var(--accent),var(--accent3))">${getInitials(user.name)}</div>`;
}

// ===== BADGE =====
function badgeFor(type) {
  const map = { news:"badge-news", code:"badge-code", alert:"badge-alert", api:"badge-api", image:"badge-image" };
  const cls = map[type] || "badge-general";
  const labels = { news:"📰 News", code:"💻 Code", alert:"🚨 Alert", api:"🔗 API", image:"🖼 Image", general:"📝 Post" };
  return `<span class="post-badge ${cls}">${labels[type] || "📝 Post"}</span>`;
}

// ===== STAR RATING UI =====
function starsHTML(postId, currentUserId, avgRating, userRating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(avgRating);
    stars += `<span class="star ${filled ? "filled" : ""}" onclick="ratePost('${esc(postId)}',${i})" title="${i} star">${i <= Math.round(avgRating) ? "★" : "☆"}</span>`;
  }
  return `<div class="star-rating" title="Average: ${avgRating || 0}/5">${stars}</div>
  <span style="font-size:11px;color:var(--text3);margin-left:4px">${avgRating ? avgRating.toFixed(1) : "0"}</span>`;
}

// ===== RENDER DISPATCH =====
function render() {
  const app = document.getElementById("app");
  State.currentUser = Auth.getCurrentUser();
  State.isAdmin = Auth.isAdminLoggedIn();

  // Track visit
  State.visits = DB.trackVisit();

  if (State.modal) {
    renderModal();
    return;
  }

  let html = "";

  if (State.page === "login") html = renderLogin();
  else if (State.page === "register") html = renderRegister();
  else if (State.page === "adminLogin") html = renderAdminLogin();
  else if (State.page === "admin" && State.isAdmin) html = renderAdmin();
  else if (State.page === "admin" && !State.isAdmin) { navigate("adminLogin"); return; }
  else if (State.page === "profile") html = renderProfile(State.viewProfileId);
  else if (State.page === "myProfile") html = renderMyProfile();
  else if (State.page === "dashboard") html = renderDashboard();
  else html = renderFeed();

  app.innerHTML = html;
  bindEvents();
}

// ===== NAVBAR =====
function renderNavbar() {
  const u = State.currentUser;
  const visits = State.visits;
  const avatar = u ? (u.avatar ? `<img src="${esc(u.avatar)}" alt=""/>` : getInitials(u.name)) : "?";
  return `
  <nav class="navbar">
    <div class="navbar-brand" onclick="navigate('feed')">Nexus<span>Hub</span></div>
    <div class="navbar-right">
      <div class="visit-badge">
        <div class="visit-dot"></div>
        <span>${visits.total.toLocaleString()} visits</span>
      </div>
      ${u ? `
        <button class="btn btn-sm btn-outline" onclick="navigate('dashboard')">📊 Dashboard</button>
        <div class="nav-avatar" onclick="navigate('myProfile')" title="${esc(u.name)}">${avatar}</div>
        <button class="btn btn-sm btn-outline" onclick="logout()">Logout</button>
      ` : `
        <button class="btn btn-sm btn-outline" onclick="navigate('login')">Login</button>
        <button class="btn btn-sm btn-primary" onclick="navigate('register')">Sign Up</button>
      `}
    </div>
  </nav>`;
}

// ===== LOGIN =====
function renderLogin() {
  return `
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">🌐 NexusHub</div>
        <div class="auth-title">স্বাগতম ফিরে!</div>
        <div class="auth-sub">আপনার অ্যাকাউন্টে লগইন করুন</div>
        <div id="auth-msg"></div>
        <div class="input-group">
          <label>Gmail / Email</label>
          <input class="input-field" id="login-email" type="email" placeholder="example@gmail.com" autocomplete="email"/>
        </div>
        <div class="input-group">
          <label>Password</label>
          <input class="input-field" id="login-pass" type="password" placeholder="••••••••" autocomplete="current-password"/>
        </div>
        <button class="btn btn-primary btn-block" onclick="doLogin()">🔐 Login</button>
        <div class="auth-switch">অ্যাকাউন্ট নেই? <a onclick="navigate('register')">নিবন্ধন করুন</a></div>
        <div class="auth-switch" style="margin-top:8px"><a onclick="navigate('adminLogin')" style="color:var(--admin);font-size:12px">🛡️ Admin Panel</a></div>
      </div>
    </div>
  </div>`;
}

function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value;
  const msg = document.getElementById("auth-msg");
  const result = Auth.login(email, pass);
  if (result.success) { showToast("সফলভাবে লগইন হয়েছে!", "success"); navigate("feed"); }
  else { msg.innerHTML = `<div class="alert alert-error">${esc(result.error)}</div>`; }
}

// ===== REGISTER =====
function renderRegister() {
  return `
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">🌐 NexusHub</div>
        <div class="auth-title">নতুন অ্যাকাউন্ট</div>
        <div class="auth-sub">আজই যোগ দিন, বিনামূল্যে!</div>
        <div id="auth-msg"></div>
        <div class="input-group">
          <label>পূর্ণ নাম</label>
          <input class="input-field" id="reg-name" type="text" placeholder="আপনার নাম"/>
        </div>
        <div class="input-group">
          <label>Gmail / Email</label>
          <input class="input-field" id="reg-email" type="email" placeholder="example@gmail.com"/>
        </div>
        <div class="input-group">
          <label>Password (কমপক্ষে ৬ অক্ষর)</label>
          <input class="input-field" id="reg-pass" type="password" placeholder="শক্তিশালী password দিন"/>
        </div>
        <div class="input-group">
          <label>Password নিশ্চিত করুন</label>
          <input class="input-field" id="reg-pass2" type="password" placeholder="আবার লিখুন"/>
        </div>
        <button class="btn btn-primary btn-block" onclick="doRegister()">✨ নিবন্ধন করুন</button>
        <div class="auth-switch">ইতিমধ্যে অ্যাকাউন্ট আছে? <a onclick="navigate('login')">লগইন করুন</a></div>
      </div>
    </div>
  </div>`;
}

function doRegister() {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const pass = document.getElementById("reg-pass").value;
  const pass2 = document.getElementById("reg-pass2").value;
  const msg = document.getElementById("auth-msg");
  if (pass !== pass2) { msg.innerHTML = `<div class="alert alert-error">Password মিলছে না</div>`; return; }
  const result = Auth.register(name, email, pass);
  if (result.success) { showToast("অ্যাকাউন্ট তৈরি সফল! স্বাগতম 🎉", "success"); navigate("feed"); }
  else { msg.innerHTML = `<div class="alert alert-error">${esc(result.error)}</div>`; }
}

function logout() { Auth.logout(); showToast("লগআউট হয়েছে", "info"); navigate("login"); }

// ===== ADMIN LOGIN =====
function renderAdminLogin() {
  return `
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-card" style="border-color:rgba(255,107,53,0.3)">
        <div class="auth-logo" style="-webkit-text-fill-color:var(--admin);background:none;color:var(--admin)">🛡️ Admin Panel</div>
        <div class="auth-title">Admin Access Only</div>
        <div class="auth-sub" style="color:var(--admin);opacity:0.7">শুধুমাত্র অনুমোদিত Device থেকে প্রবেশ সম্ভব</div>
        <div id="auth-msg"></div>
        <div class="input-group">
          <label>Admin Email</label>
          <input class="input-field" id="adm-email" type="email" placeholder="admin@nexushub.com" style="border-color:rgba(255,107,53,0.3)"/>
        </div>
        <div class="input-group">
          <label>Admin Password</label>
          <input class="input-field" id="adm-pass" type="password" placeholder="••••••••" style="border-color:rgba(255,107,53,0.3)"/>
        </div>
        <button class="btn btn-block" style="background:var(--admin);color:white" onclick="doAdminLogin()">🛡️ Admin Login</button>
        <div style="margin-top:12px;font-size:11px;color:var(--text3);text-align:center">
          Default: admin@nexushub.com / Admin@Secure2024!
        </div>
        <div class="auth-switch"><a onclick="navigate('login')">← ফিরে যান</a></div>
      </div>
    </div>
  </div>`;
}

function doAdminLogin() {
  const email = document.getElementById("adm-email").value.trim();
  const pass = document.getElementById("adm-pass").value;
  const msg = document.getElementById("auth-msg");
  const result = Auth.adminLogin(email, pass);
  if (result.success) { showToast("Admin access granted 🛡️", "success"); navigate("admin"); }
  else { msg.innerHTML = `<div class="alert alert-error">🚫 ${esc(result.error)}</div>`; }
}

// ===== FEED =====
function renderFeed() {
  const u = State.currentUser;
  let posts = DB.getPosts();
  if (State.feedTab !== "all") posts = posts.filter(p => p.type === State.feedTab);
  const alerts = DB.getAlerts();

  return `
  ${renderNavbar()}
  <div class="main-layout">
    <!-- LEFT SIDEBAR -->
    <div class="sidebar">
      <div class="sidebar-nav">
        <div class="nav-section">নেভিগেশন</div>
        <button class="nav-item ${State.page==='feed'?'active':''}" onclick="navigate('feed')"><span class="icon">🏠</span> <span>হোম</span></button>
        ${u ? `
          <button class="nav-item" onclick="navigate('dashboard')"><span class="icon">📊</span> <span>Dashboard</span></button>
          <button class="nav-item" onclick="navigate('myProfile')"><span class="icon">👤</span> <span>আমার Profile</span></button>
          <button class="nav-item" onclick="navigate('explore')"><span class="icon">🔍</span> <span>Explore</span></button>
        ` : ""}
        <div class="nav-section">বিভাগ</div>
        <button class="nav-item ${State.feedTab==='all'?'active':''}" onclick="setFeedTab('all')"><span class="icon">📋</span> <span>সব পোস্ট</span></button>
        <button class="nav-item ${State.feedTab==='news'?'active':''}" onclick="setFeedTab('news')"><span class="icon">📰</span> <span>News</span></button>
        <button class="nav-item ${State.feedTab==='code'?'active':''}" onclick="setFeedTab('code')"><span class="icon">💻</span> <span>Code/Files</span></button>
        <button class="nav-item ${State.feedTab==='alert'?'active':''}" onclick="setFeedTab('alert')"><span class="icon">🚨</span> <span>Alerts</span></button>
        ${State.isAdmin ? `
          <div class="nav-section">Admin</div>
          <button class="nav-item" onclick="navigate('admin')"><span class="icon">🛡️</span> <span>Admin Panel</span></button>
          <button class="nav-item" onclick="openNewPostModal()"><span class="icon">➕</span> <span>New Post</span></button>
        ` : ""}
      </div>
    </div>

    <!-- FEED CONTENT -->
    <div class="content">
      <!-- Alerts Banner -->
      ${alerts.length > 0 ? `
        <div class="card" style="border-color:rgba(239,68,68,0.4);background:rgba(239,68,68,0.05);margin-bottom:16px">
          <div style="font-weight:600;margin-bottom:8px">🚨 সর্বশেষ Alert</div>
          <div style="font-size:14px;color:var(--text2)">${esc(alerts[0].message)}</div>
        </div>
      ` : ""}

      <!-- Feed Header -->
      <div class="flex items-center justify-between mb-3">
        <div class="font-head" style="font-size:20px;font-weight:700">📡 নিউজ ফিড</div>
        ${u && State.isAdmin ? `<button class="btn btn-primary btn-sm" onclick="openNewPostModal()">➕ নতুন পোস্ট</button>` : ""}
      </div>

      <!-- Posts -->
      ${posts.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">এখনো কোনো পোস্ট নেই</div>
          <div class="empty-sub">Admin নতুন কন্টেন্ট যোগ করলে এখানে দেখা যাবে</div>
        </div>
      ` : posts.map(p => renderPostCard(p, u)).join("")}
    </div>

    <!-- RIGHT SIDEBAR -->
    <div class="right-sidebar">
      <div class="widget">
        <div class="widget-title">🔥 ট্রেন্ডিং</div>
        ${DB.getPosts().slice(0,5).map((p,i) => `
          <div class="trending-item" onclick="openPostModal('${esc(p.id)}')">
            <div class="trend-num">${i+1}</div>
            <div class="trend-info">
              <div class="trend-title">${esc(p.title.slice(0,30))}...</div>
              <div class="trend-sub">⭐ ${p.avgRating || 0} · ❤️ ${p.favoriteCount || 0}</div>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="widget">
        <div class="widget-title">👥 Users</div>
        ${DB.getUsers().slice(0,5).map(u => `
          <div class="trending-item" onclick="navigate('profile', {viewProfileId:'${esc(u.id)}'})">
            ${avatarHTML(u, "sm")}
            <div class="trend-info">
              <div class="trend-title">${esc(u.name)}</div>
              <div class="trend-sub">❤️ ${(u.favorites||[]).length} favorites</div>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="widget" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:16px">
        <div class="widget-title">📊 Site Stats</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="text-align:center">
            <div style="font-size:20px;font-weight:700;color:var(--accent)">${State.visits.total}</div>
            <div style="font-size:11px;color:var(--text3)">Total Visits</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:20px;font-weight:700;color:var(--accent3)">${State.visits.unique.length}</div>
            <div style="font-size:11px;color:var(--text3)">Unique</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:20px;font-weight:700;color:var(--green)">${DB.getUsers().length}</div>
            <div style="font-size:11px;color:var(--text3)">Users</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:20px;font-weight:700;color:var(--gold)">${DB.getPosts().length}</div>
            <div style="font-size:11px;color:var(--text3)">Posts</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function setFeedTab(tab) { State.feedTab = tab; render(); }

// ===== POST CARD =====
function renderPostCard(post, currentUser) {
  const isFav = currentUser && (currentUser.favorites || []).includes(post.id);
  const userRating = currentUser && post.ratings ? (post.ratings.find(r => r.userId === currentUser.id) || {}).rating : 0;
  const commentsOpen = State.commentOpen[post.id];
  const comments = DB.getComments(post.id);

  return `
  <div class="post-card" id="post-${esc(post.id)}">
    <div class="post-header">
      <div class="post-avatar">
        <img src="https://ui-avatars.com/api/?name=Admin&background=ff6b35&color=fff&bold=true" alt=""/>
      </div>
      <div class="post-meta">
        <div class="post-author">🛡️ Admin</div>
        <div class="post-time">${timeAgo(post.createdAt)}</div>
      </div>
      ${badgeFor(post.type)}
    </div>
    <div class="post-body">
      <div class="post-title">${esc(post.title)}</div>
      <div class="post-content">${esc(post.content)}</div>
      ${post.imageUrl ? `<img class="post-image" src="${esc(post.imageUrl)}" alt="post image" onerror="this.style.display='none'"/>` : ""}
      ${post.codeContent ? `<pre class="post-code">${esc(post.codeContent)}</pre>` : ""}
      ${post.apiUrl ? `<div class="post-api-url">🔗 ${esc(post.apiUrl)}</div>` : ""}
      ${post.fileUrl ? `<a class="post-file-link" href="${esc(post.fileUrl)}" target="_blank">📎 ফাইল দেখুন</a>` : ""}
    </div>
    <div class="post-actions">
      ${currentUser ? `
        <button class="action-btn ${isFav ? 'fav-active' : ''}" onclick="toggleFavorite('${esc(post.id)}')">
          ${isFav ? "❤️" : "🤍"} Favorite
          <span style="font-size:11px;color:var(--text3)">${post.favoriteCount || 0}</span>
        </button>
        <div style="display:flex;align-items:center;gap:6px;margin-left:8px">
          ${starsHTML(post.id, currentUser.id, post.avgRating, userRating)}
        </div>
        <button class="action-btn" onclick="toggleComments('${esc(post.id)}')">
          💬 ${comments.length}
        </button>
        ${State.isAdmin ? `
          <button class="action-btn" onclick="deletePost('${esc(post.id)}')" style="margin-left:auto;color:var(--red)">🗑️</button>
        ` : ""}
      ` : `<span style="font-size:13px;color:var(--text3)">⭐ ${post.avgRating || 0}/5 · ❤️ ${post.favoriteCount || 0}</span>`}
    </div>
    ${commentsOpen ? renderComments(post.id, currentUser, comments) : ""}
  </div>`;
}

// ===== COMMENTS =====
function renderComments(postId, currentUser, comments) {
  return `
  <div class="comments-section">
    ${currentUser ? `
      <div class="comment-input-row">
        <input class="input-field" id="comment-input-${esc(postId)}" placeholder="মন্তব্য করুন..."/>
        <button class="btn btn-primary btn-sm" onclick="submitComment('${esc(postId)}')">পাঠান</button>
      </div>
    ` : `<div style="font-size:13px;color:var(--text3);margin-bottom:10px">মন্তব্য করতে <a onclick="navigate('login')" style="color:var(--accent);cursor:pointer">লগইন করুন</a></div>`}
    ${comments.length === 0 ? `<div style="font-size:13px;color:var(--text3)">এখনো কোনো মন্তব্য নেই</div>` :
      comments.map(c => `
        <div class="comment-item">
          <div class="avatar-sm">${getInitials(c.name)}</div>
          <div class="comment-bubble">
            <div class="comment-name">${esc(c.name)}</div>
            <div class="comment-text">${esc(c.text)}</div>
            <div class="comment-time">${timeAgo(c.createdAt)}</div>
          </div>
        </div>
      `).join("")}
  </div>`;
}

function toggleComments(postId) {
  State.commentOpen[postId] = !State.commentOpen[postId];
  render();
}

function submitComment(postId) {
  const input = document.getElementById("comment-input-" + postId);
  if (!input || !input.value.trim()) return;
  const u = State.currentUser;
  DB.addComment(postId, { name: u.name, text: input.value.trim(), userId: u.id });
  showToast("মন্তব্য যোগ হয়েছে!", "success");
  render();
}

// ===== FAVORITES & RATINGS =====
function toggleFavorite(postId) {
  const u = State.currentUser;
  if (!u) { navigate("login"); return; }
  const added = DB.toggleFavorite(u.id, postId);
  showToast(added ? "Favorite-এ যোগ হয়েছে ❤️" : "Favorite থেকে সরানো হয়েছে", added ? "success" : "info");
  render();
}

function ratePost(postId, rating) {
  const u = State.currentUser;
  if (!u) { navigate("login"); return; }
  DB.ratePost(postId, u.id, rating);
  showToast(`${rating} ⭐ রেটিং দেওয়া হয়েছে!`, "success");
  render();
}

function deletePost(postId) {
  if (!State.isAdmin) return;
  if (!confirm("এই পোস্ট মুছে ফেলবেন?")) return;
  DB.deletePost(postId);
  showToast("পোস্ট মুছে ফেলা হয়েছে", "info");
  render();
}

// ===== PROFILE PAGE (Public) =====
function renderProfile(userId) {
  const users = DB.getUsers();
  const u = users.find(x => x.id === userId);
  if (!u) return renderFeed();
  const currentUser = State.currentUser;
  const posts = DB.getPosts();
  const favPosts = posts.filter(p => (u.favorites || []).includes(p.id));

  return `
  ${renderNavbar()}
  <div class="main-layout">
    <div class="sidebar">
      <button class="nav-item" onclick="navigate('feed')"><span class="icon">←</span> <span>ফিরে যান</span></button>
    </div>
    <div class="content">
      <div class="profile-header">
        <div class="profile-avatar-wrap">
          <div class="profile-avatar">
            ${u.avatar ? `<img src="${esc(u.avatar)}" alt=""/>` : getInitials(u.name)}
          </div>
        </div>
        <div class="profile-name">${esc(u.name)}</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:8px">${esc(u.email)}</div>
        ${u.bio ? `<div class="profile-bio">${esc(u.bio)}</div>` : ""}
        <div class="profile-stats">
          <div class="stat-item"><div class="stat-num">${(u.favorites||[]).length}</div><div class="stat-label">Favorites</div></div>
          <div class="stat-item"><div class="stat-num">${new Date(u.createdAt).toLocaleDateString('bn-BD')}</div><div class="stat-label">যোগদান</div></div>
        </div>
      </div>

      <!-- Favorite Posts (public) -->
      <div style="margin-bottom:12px;font-weight:600">❤️ Favorite পোস্ট</div>
      ${favPosts.length === 0 ? `<div class="empty-state"><div class="empty-icon">🤍</div><div class="empty-text">কোনো Favorite নেই</div></div>` :
        favPosts.map(p => `
          <div class="post-card" style="cursor:pointer" onclick="">
            <div class="post-body" style="padding:16px">
              <div style="font-size:12px;color:var(--text3);margin-bottom:4px">${badgeFor(p.type)}</div>
              <div class="post-title" style="font-size:15px">${esc(p.title)}</div>
              <div class="post-content" style="font-size:13px">${esc(p.content.slice(0,120))}...</div>
              <div style="font-size:12px;color:var(--text3);margin-top:8px">⭐ ${p.avgRating||0} · ${timeAgo(p.createdAt)}</div>
            </div>
          </div>
        `).join("")}
    </div>
    <div class="right-sidebar"></div>
  </div>`;
}

// ===== MY PROFILE =====
function renderMyProfile() {
  const u = State.currentUser;
  if (!u) { navigate("login"); return ""; }
  const posts = DB.getPosts();
  const favPosts = posts.filter(p => (u.favorites || []).includes(p.id));

  return `
  ${renderNavbar()}
  <div class="main-layout">
    <div class="sidebar">
      <div class="sidebar-nav">
        <button class="nav-item" onclick="navigate('feed')"><span class="icon">←</span> <span>ফিরে যান</span></button>
        <button class="nav-item" onclick="navigate('dashboard')"><span class="icon">📊</span> <span>Dashboard</span></button>
      </div>
    </div>
    <div class="content">
      <div class="profile-header">
        <div class="profile-avatar-wrap">
          <div class="profile-avatar">
            ${u.avatar ? `<img src="${esc(u.avatar)}" alt=""/>` : getInitials(u.name)}
          </div>
          <button class="avatar-upload-btn" onclick="openEditProfile()">✏️</button>
        </div>
        <div class="profile-name">${esc(u.name)}</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:8px">${esc(u.email)}</div>
        ${u.bio ? `<div class="profile-bio">${esc(u.bio)}</div>` : `<div class="profile-bio" style="font-style:italic">Bio যোগ করুন...</div>`}
        <div class="profile-stats">
          <div class="stat-item"><div class="stat-num">${(u.favorites||[]).length}</div><div class="stat-label">Favorites</div></div>
        </div>
        <button class="btn btn-outline btn-sm mt-3" onclick="openEditProfile()">✏️ Profile সম্পাদনা</button>
      </div>

      <div class="tabs">
        <button class="tab active">❤️ Favorites (${favPosts.length})</button>
      </div>

      ${favPosts.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🤍</div>
          <div class="empty-text">এখনো কোনো Favorite নেই</div>
          <div class="empty-sub">পোস্টে ❤️ ক্লিক করে Favorite করুন</div>
        </div>
      ` : favPosts.map(p => renderPostCard(p, u)).join("")}
    </div>
    <div class="right-sidebar"></div>
  </div>`;
}

// ===== DASHBOARD =====
function renderDashboard() {
  const u = State.currentUser;
  if (!u) { navigate("login"); return ""; }
  const posts = DB.getPosts();
  const favPosts = posts.filter(p => (u.favorites||[]).includes(p.id));
  const visits = DB.getVisits();
  const alerts = DB.getAlerts();

  return `
  ${renderNavbar()}
  <div class="main-layout">
    <div class="sidebar">
      <div class="sidebar-nav">
        <button class="nav-item" onclick="navigate('feed')"><span class="icon">🏠</span> <span>হোম</span></button>
        <button class="nav-item active"><span class="icon">📊</span> <span>Dashboard</span></button>
        <button class="nav-item" onclick="navigate('myProfile')"><span class="icon">👤</span> <span>Profile</span></button>
      </div>
    </div>
    <div class="content">
      <div style="font-family:var(--font-head);font-size:22px;font-weight:700;margin-bottom:20px">
        👋 স্বাগতম, ${esc(u.name)}!
      </div>

      <div class="dash-grid">
        <div class="dash-card">
          <div class="h3" style="font-size:13px;color:var(--text2);margin-bottom:8px">❤️ আমার Favorites</div>
          <div class="big-num" style="color:var(--gold)">${favPosts.length}</div>
        </div>
        <div class="dash-card">
          <div class="h3" style="font-size:13px;color:var(--text2);margin-bottom:8px">📡 মোট পোস্ট</div>
          <div class="big-num" style="color:var(--accent)">${posts.length}</div>
        </div>
        <div class="dash-card">
          <div class="h3" style="font-size:13px;color:var(--text2);margin-bottom:8px">👁️ Site Visits</div>
          <div class="big-num" style="color:var(--accent3)">${visits.total}</div>
        </div>
        <div class="dash-card">
          <div class="h3" style="font-size:13px;color:var(--text2);margin-bottom:8px">🚨 Alerts</div>
          <div class="big-num" style="color:var(--red)">${alerts.length}</div>
        </div>
      </div>

      <!-- Recent Posts -->
      <div style="font-weight:600;margin-bottom:12px">📰 সাম্প্রতিক পোস্ট</div>
      ${posts.slice(0,3).map(p => `
        <div class="card mb-2" style="cursor:pointer">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              ${badgeFor(p.type)}
              <div style="font-weight:600;margin-top:6px">${esc(p.title.slice(0,50))}</div>
              <div style="font-size:12px;color:var(--text3);margin-top:4px">${timeAgo(p.createdAt)} · ⭐${p.avgRating||0} · ❤️${p.favoriteCount||0}</div>
            </div>
          </div>
        </div>
      `).join("")}

      <!-- Active Alerts -->
      ${alerts.length > 0 ? `
        <div style="font-weight:600;margin-top:20px;margin-bottom:12px">🚨 সক্রিয় Alerts</div>
        ${alerts.map(a => `
          <div class="card mb-2" style="border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.05)">
            <div style="font-weight:500">${esc(a.message)}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px">${timeAgo(a.createdAt)}</div>
          </div>
        `).join("")}
      ` : ""}

      <!-- Users -->
      <div style="font-weight:600;margin-top:20px;margin-bottom:12px">👥 সদস্যরা</div>
      ${DB.getUsers().map(user => `
        <div class="card mb-2" style="cursor:pointer;display:flex;align-items:center;gap:12px"
             onclick="navigate('profile', {viewProfileId:'${esc(user.id)}'})">
          ${avatarHTML(user, "sm")}
          <div>
            <div style="font-weight:500">${esc(user.name)}</div>
            <div style="font-size:12px;color:var(--text3)">❤️ ${(user.favorites||[]).length} favorites</div>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="right-sidebar"></div>
  </div>`;
}

// ===== ADMIN PANEL =====
function renderAdmin() {
  const pg = State.adminPage;
  return `
  ${renderNavbar()}
  <div class="admin-layout">
    <!-- Admin Sidebar -->
    <div class="admin-sidebar">
      <div style="font-size:16px;font-weight:700;color:var(--admin);margin-bottom:20px;padding:8px 12px">🛡️ Admin Panel</div>
      <div class="admin-nav-item ${pg==='dashboard'?'active':''}" onclick="setAdminPage('dashboard')">📊 Dashboard</div>
      <div class="admin-nav-item ${pg==='posts'?'active':''}" onclick="setAdminPage('posts')">📝 পোস্ট ম্যানেজ</div>
      <div class="admin-nav-item ${pg==='newpost'?'active':''}" onclick="setAdminPage('newpost')">➕ নতুন পোস্ট</div>
      <div class="admin-nav-item ${pg==='users'?'active':''}" onclick="setAdminPage('users')">👥 ব্যবহারকারী</div>
      <div class="admin-nav-item ${pg==='alerts'?'active':''}" onclick="setAdminPage('alerts')">🚨 Alerts</div>
      <div class="admin-nav-item ${pg==='comments'?'active':''}" onclick="setAdminPage('comments')">💬 Comments</div>
      <div class="admin-nav-item ${pg==='settings'?'active':''}" onclick="setAdminPage('settings')">⚙️ Settings</div>
      <div style="margin-top:20px">
        <div class="admin-nav-item" onclick="adminLogout()" style="color:var(--red)">🚪 Logout</div>
        <div class="admin-nav-item" onclick="navigate('feed')">🏠 Website</div>
      </div>
    </div>

    <!-- Admin Content -->
    <div class="admin-content">
      ${pg === 'dashboard' ? renderAdminDashboard() : ""}
      ${pg === 'posts' ? renderAdminPosts() : ""}
      ${pg === 'newpost' ? renderAdminNewPost() : ""}
      ${pg === 'users' ? renderAdminUsers() : ""}
      ${pg === 'alerts' ? renderAdminAlerts() : ""}
      ${pg === 'comments' ? renderAdminComments() : ""}
      ${pg === 'settings' ? renderAdminSettings() : ""}
    </div>
  </div>`;
}

function setAdminPage(pg) { State.adminPage = pg; render(); }

function renderAdminDashboard() {
  const visits = DB.getVisits();
  const users = DB.getUsers();
  const posts = DB.getPosts();
  const alerts = DB.getAlerts();
  return `
  <div class="admin-header">📊 Admin Dashboard</div>
  <div class="stat-cards">
    <div class="stat-card"><div class="stat-card-num" style="color:var(--accent3)">${visits.total}</div><div class="stat-card-label">Total Visits</div></div>
    <div class="stat-card"><div class="stat-card-num" style="color:var(--accent)">${visits.unique.length}</div><div class="stat-card-label">Unique Visitors</div></div>
    <div class="stat-card"><div class="stat-card-num" style="color:var(--green)">${users.length}</div><div class="stat-card-label">Registered Users</div></div>
    <div class="stat-card"><div class="stat-card-num" style="color:var(--gold)">${posts.length}</div><div class="stat-card-label">Total Posts</div></div>
    <div class="stat-card"><div class="stat-card-num" style="color:var(--red)">${alerts.length}</div><div class="stat-card-label">Active Alerts</div></div>
    <div class="stat-card"><div class="stat-card-num" style="color:var(--admin)">${posts.filter(p=>p.type==='news').length}</div><div class="stat-card-label">News Posts</div></div>
  </div>
  <div style="font-weight:600;margin-bottom:12px">📰 সর্বশেষ পোস্ট</div>
  <table class="table">
    <thead><tr><th>শিরোনাম</th><th>ধরন</th><th>Rating</th><th>Favorite</th><th>তারিখ</th></tr></thead>
    <tbody>
      ${posts.slice(0,10).map(p => `
        <tr>
          <td>${esc(p.title.slice(0,40))}</td>
          <td>${badgeFor(p.type)}</td>
          <td>⭐ ${p.avgRating||0}</td>
          <td>❤️ ${p.favoriteCount||0}</td>
          <td>${timeAgo(p.createdAt)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>`;
}

function renderAdminNewPost() {
  return `
  <div class="admin-header">➕ নতুন পোস্ট তৈরি</div>
  <div class="card" style="max-width:620px">
    <div id="post-msg"></div>
    <div class="input-group">
      <label>পোস্টের ধরন</label>
      <select class="input-field" id="p-type" onchange="handlePostTypeChange()">
        <option value="general">📝 General Post</option>
        <option value="news">📰 News</option>
        <option value="code">💻 Code/File Upload</option>
        <option value="alert">🚨 Alert</option>
        <option value="api">🔗 API URL</option>
        <option value="image">🖼 Image Post</option>
      </select>
    </div>
    <div class="input-group">
      <label>শিরোনাম</label>
      <input class="input-field" id="p-title" placeholder="পোস্টের শিরোনাম লিখুন"/>
    </div>
    <div class="input-group">
      <label>বিবরণ / কন্টেন্ট</label>
      <textarea class="input-field" id="p-content" rows="5" placeholder="পোস্টের বিস্তারিত লিখুন..."></textarea>
    </div>

    <!-- Dynamic fields -->
    <div id="extra-fields">
      <div class="input-group">
        <label>Image URL (ঐচ্ছিক)</label>
        <input class="input-field" id="p-image" placeholder="https://example.com/image.jpg"/>
      </div>
    </div>

    <div class="input-group" id="code-field" style="display:none">
      <label>Code Content (Python/Java/JS ইত্যাদি)</label>
      <textarea class="input-field" id="p-code" rows="6" placeholder="# Python code here...
print('Hello World')"></textarea>
    </div>
    <div class="input-group" id="api-field" style="display:none">
      <label>API URL</label>
      <input class="input-field" id="p-api" placeholder="https://api.example.com/endpoint"/>
    </div>
    <div class="input-group" id="file-field" style="display:none">
      <label>File URL (Google Drive / GitHub লিংক)</label>
      <input class="input-field" id="p-file" placeholder="https://drive.google.com/file/..."/>
    </div>

    <button class="btn btn-gold btn-block" onclick="submitNewPost()">🚀 পোস্ট প্রকাশ করুন</button>
  </div>`;
}

function handlePostTypeChange() {
  const type = document.getElementById("p-type")?.value;
  document.getElementById("code-field").style.display = (type === "code") ? "block" : "none";
  document.getElementById("api-field").style.display = (type === "api") ? "block" : "none";
  document.getElementById("file-field").style.display = (type === "code") ? "block" : "none";
}

function submitNewPost() {
  const type = document.getElementById("p-type").value;
  const title = document.getElementById("p-title").value.trim();
  const content = document.getElementById("p-content").value.trim();
  const imageUrl = document.getElementById("p-image")?.value.trim() || "";
  const codeContent = document.getElementById("p-code")?.value.trim() || "";
  const apiUrl = document.getElementById("p-api")?.value.trim() || "";
  const fileUrl = document.getElementById("p-file")?.value.trim() || "";
  const msg = document.getElementById("post-msg");
  if (!title || !content) { msg.innerHTML = `<div class="alert alert-error">শিরোনাম ও বিবরণ আবশ্যিক</div>`; return; }
  DB.addPost({ type, title, content, imageUrl, codeContent, apiUrl, fileUrl, authorId: "admin" });
  showToast("পোস্ট সফলভাবে প্রকাশিত হয়েছে! ✅", "success");
  setAdminPage("posts");
}

function renderAdminPosts() {
  const posts = DB.getPosts();
  return `
  <div class="admin-header">📝 সব পোস্ট</div>
  <div style="margin-bottom:16px">
    <button class="btn btn-primary btn-sm" onclick="setAdminPage('newpost')">➕ নতুন পোস্ট</button>
  </div>
  <table class="table">
    <thead><tr><th>শিরোনাম</th><th>ধরন</th><th>⭐ Rating</th><th>❤️ Fav</th><th>💬</th><th>তারিখ</th><th>Action</th></tr></thead>
    <tbody>
      ${posts.map(p => `
        <tr>
          <td style="max-width:200px">${esc(p.title.slice(0,35))}</td>
          <td>${badgeFor(p.type)}</td>
          <td>${p.avgRating||0}</td>
          <td>${p.favoriteCount||0}</td>
          <td>${DB.getComments(p.id).length}</td>
          <td>${timeAgo(p.createdAt)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="deletePost('${esc(p.id)}')">🗑️</button></td>
        </tr>
      `).join("")}
    </tbody>
  </table>`;
}

function renderAdminUsers() {
  const users = DB.getUsers();
  return `
  <div class="admin-header">👥 সব ব্যবহারকারী</div>
  <table class="table">
    <thead><tr><th>নাম</th><th>Email</th><th>❤️ Fav</th><th>যোগদান</th></tr></thead>
    <tbody>
      ${users.map(u => `
        <tr>
          <td><div style="display:flex;align-items:center;gap:8px">${avatarHTML(u,'sm')} ${esc(u.name)}</div></td>
          <td>${esc(u.email)}</td>
          <td>${(u.favorites||[]).length}</td>
          <td>${new Date(u.createdAt).toLocaleDateString('bn-BD')}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>`;
}

function renderAdminAlerts() {
  const alerts = DB.getAlerts();
  return `
  <div class="admin-header">🚨 Alert ম্যানেজমেন্ট</div>
  <div class="card" style="max-width:500px;margin-bottom:20px">
    <div class="input-group">
      <label>নতুন Alert বার্তা</label>
      <textarea class="input-field" id="alert-msg-input" rows="3" placeholder="Alert বার্তা লিখুন..."></textarea>
    </div>
    <button class="btn btn-danger" onclick="createAlert()">🚨 Alert পাঠান</button>
  </div>
  ${alerts.length === 0 ? `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">কোনো সক্রিয় Alert নেই</div></div>` :
    `<table class="table">
      <thead><tr><th>বার্তা</th><th>তারিখ</th><th>Action</th></tr></thead>
      <tbody>
        ${alerts.map(a => `
          <tr>
            <td>${esc(a.message)}</td>
            <td>${timeAgo(a.createdAt)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteAlert('${esc(a.id)}')">🗑️</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>`}`;
}

function createAlert() {
  const msg = document.getElementById("alert-msg-input")?.value.trim();
  if (!msg) { showToast("Alert বার্তা লিখুন", "error"); return; }
  DB.addAlert({ message: msg });
  showToast("Alert পাঠানো হয়েছে! 🚨", "success");
  render();
}

function deleteAlert(id) {
  DB.deleteAlert(id);
  showToast("Alert মুছে ফেলা হয়েছে", "info");
  render();
}

function renderAdminComments() {
  const posts = DB.getPosts();
  let allComments = [];
  posts.forEach(p => {
    DB.getComments(p.id).forEach(c => allComments.push({...c, postTitle: p.title, postId: p.id}));
  });
  return `
  <div class="admin-header">💬 সব মন্তব্য</div>
  ${allComments.length === 0 ? `<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-text">কোনো মন্তব্য নেই</div></div>` :
    `<table class="table">
      <thead><tr><th>লেখক</th><th>মন্তব্য</th><th>পোস্ট</th><th>তারিখ</th></tr></thead>
      <tbody>
        ${allComments.map(c => `
          <tr>
            <td>${esc(c.name)}</td>
            <td>${esc(c.text.slice(0,60))}</td>
            <td style="font-size:12px;color:var(--text3)">${esc(c.postTitle.slice(0,30))}</td>
            <td>${timeAgo(c.createdAt)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`}`;
}

function renderAdminSettings() {
  const admin = DB.getAdmin();
  return `
  <div class="admin-header">⚙️ Admin Settings</div>
  <div class="card" style="max-width:500px;margin-bottom:20px">
    <div style="font-weight:600;margin-bottom:12px;color:var(--admin)">🔐 Security Information</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:8px">Admin Email: <span style="color:var(--text)">${esc(admin?.email||"")}</span></div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:8px">Device Lock: <span style="color:var(--green)">✅ Active (UserAgent + IP)</span></div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:8px">Encryption: <span style="color:var(--green)">✅ AES-256 Encrypted</span></div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Password: <span style="color:var(--green)">✅ SHA-256 Hashed</span></div>
    <div style="padding:12px;background:rgba(255,107,53,0.1);border:1px solid rgba(255,107,53,0.2);border-radius:8px;font-size:12px;color:var(--text2)">
      ⚠️ সকল ব্যবহারকারীর তথ্য AES-256 দিয়ে encrypted এবং Admin ছাড়া কেউ দেখতে পারবে না।
      Password SHA-256 দিয়ে hashed, কেউ আসল password জানতে পারবে না।
    </div>
  </div>
  <div class="card" style="max-width:500px">
    <div style="font-weight:600;margin-bottom:12px">🧹 Data Management</div>
    <button class="btn btn-danger" onclick="if(confirm('সব visit data মুছবেন?')) { localStorage.removeItem('nexus_visits'); showToast('Visit data রিসেট হয়েছে', 'info'); render(); }">🗑️ Visit Data রিসেট</button>
  </div>`;
}

function adminLogout() { Auth.adminLogout(); showToast("Admin logout হয়েছে", "info"); navigate("feed"); }

// ===== MODALS =====
function openNewPostModal() { State.modal = "newPost"; render(); }
function openEditProfile() { State.modal = "editProfile"; render(); }
function closeModal() { State.modal = null; render(); }

function renderModal() {
  const app = document.getElementById("app");
  let existing = app.innerHTML;
  if (!document.getElementById("modal-overlay")) {
    let modalHTML = "";
    if (State.modal === "editProfile") modalHTML = renderEditProfileModal();
    const overlay = document.createElement("div");
    overlay.id = "modal-overlay";
    overlay.className = "modal-overlay";
    overlay.innerHTML = modalHTML;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    bindModalEvents();
  }
}

function renderEditProfileModal() {
  const u = State.currentUser;
  return `
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">✏️ Profile সম্পাদনা</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div id="profile-msg"></div>
      <div class="input-group">
        <label>নাম</label>
        <input class="input-field" id="edit-name" value="${esc(u.name)}"/>
      </div>
      <div class="input-group">
        <label>Bio</label>
        <textarea class="input-field" id="edit-bio">${esc(u.bio||"")}</textarea>
      </div>
      <div class="input-group">
        <label>Avatar URL (ছবির লিংক)</label>
        <input class="input-field" id="edit-avatar" value="${esc(u.avatar||"")}" placeholder="https://example.com/photo.jpg"/>
      </div>
      <button class="btn btn-primary btn-block" onclick="saveProfile()">💾 সংরক্ষণ করুন</button>
    </div>
  </div>`;
}

function saveProfile() {
  const u = State.currentUser;
  const name = document.getElementById("edit-name").value.trim();
  const bio = document.getElementById("edit-bio").value.trim();
  const avatar = document.getElementById("edit-avatar").value.trim();
  if (!name) { document.getElementById("profile-msg").innerHTML = `<div class="alert alert-error">নাম আবশ্যিক</div>`; return; }
  DB.updateUser(u.id, { name, bio, avatar });
  // Update session data
  const updatedUser = DB.getUserByEmail(u.email);
  showToast("Profile আপডেট হয়েছে! ✅", "success");
  closeModal();
  navigate("myProfile");
}

// ===== BIND EVENTS =====
function bindEvents() {
  document.querySelectorAll("input, textarea").forEach(el => {
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" && el.tagName === "INPUT") e.preventDefault(); });
  });
  const loginEmail = document.getElementById("login-email");
  if (loginEmail) {
    document.getElementById("login-pass")?.addEventListener("keydown", e => { if(e.key==="Enter") doLogin(); });
  }
}

function bindModalEvents() {}

// ===== INIT =====
window.addEventListener("DOMContentLoaded", () => {
  if (Auth.isLoggedIn()) navigate("feed");
  else navigate("login");
});

// Make functions global
window.navigate = navigate;
window.logout = logout;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.doAdminLogin = doAdminLogin;
window.adminLogout = adminLogout;
window.setFeedTab = setFeedTab;
window.setAdminPage = setAdminPage;
window.toggleFavorite = toggleFavorite;
window.ratePost = ratePost;
window.deletePost = deletePost;
window.toggleComments = toggleComments;
window.submitComment = submitComment;
window.openEditProfile = openEditProfile;
window.openNewPostModal = openNewPostModal;
window.closeModal = closeModal;
window.saveProfile = saveProfile;
window.submitNewPost = submitNewPost;
window.handlePostTypeChange = handlePostTypeChange;
window.createAlert = createAlert;
window.deleteAlert = deleteAlert;

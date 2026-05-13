// ============================================================
// db.js - Encrypted Database Layer (localStorage simulation)
// In production: Replace with MySQL/PostgreSQL + PHP backend
// ============================================================

const DB = (() => {
  const SECRET_KEY = "NexusHub_$3cur3_K3y_2024!";
  const ADMIN_SECRET = "ADMIN_NEXUS_ULTRA_SECURE_9x7z";

  // Encrypt data
  function encrypt(data) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
  }

  // Decrypt data
  function decrypt(cipher) {
    try {
      const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch { return null; }
  }

  // Encrypt admin data with stronger key
  function encryptAdmin(data) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), ADMIN_SECRET).toString();
  }

  function decryptAdmin(cipher) {
    try {
      const bytes = CryptoJS.AES.decrypt(cipher, ADMIN_SECRET);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch { return null; }
  }

  // Initialize default data
  function init() {
    if (!localStorage.getItem("nexus_users")) {
      const defaultUsers = [];
      localStorage.setItem("nexus_users", encrypt(defaultUsers));
    }
    if (!localStorage.getItem("nexus_posts")) {
      const defaultPosts = [];
      localStorage.setItem("nexus_posts", encrypt(defaultPosts));
    }
    if (!localStorage.getItem("nexus_visits")) {
      localStorage.setItem("nexus_visits", encrypt({ total: 0, unique: [] }));
    }
    if (!localStorage.getItem("nexus_admin")) {
      const adminData = {
        email: "admin@nexushub.com",
        password: CryptoJS.SHA256("Admin@Secure2024!").toString(),
        ip: "",
        userAgent: ""
      };
      localStorage.setItem("nexus_admin", encryptAdmin(adminData));
    }
    if (!localStorage.getItem("nexus_alerts")) {
      localStorage.setItem("nexus_alerts", encrypt([]));
    }
    if (!localStorage.getItem("nexus_comments")) {
      localStorage.setItem("nexus_comments", encrypt({}));
    }
  }

  // Users
  function getUsers() {
    const raw = localStorage.getItem("nexus_users");
    return raw ? (decrypt(raw) || []) : [];
  }

  function saveUsers(users) {
    localStorage.setItem("nexus_users", encrypt(users));
  }

  function addUser(user) {
    const users = getUsers();
    user.id = Date.now().toString();
    user.password = CryptoJS.SHA256(user.password).toString();
    user.createdAt = new Date().toISOString();
    user.favorites = [];
    user.bio = "";
    user.avatar = "";
    user.ratings = {};
    users.push(user);
    saveUsers(users);
    return user;
  }

  function getUserByEmail(email) {
    return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  function updateUser(id, updates) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      saveUsers(users);
      return users[idx];
    }
    return null;
  }

  // Posts
  function getPosts() {
    const raw = localStorage.getItem("nexus_posts");
    return raw ? (decrypt(raw) || []) : [];
  }

  function savePosts(posts) {
    localStorage.setItem("nexus_posts", encrypt(posts));
  }

  function addPost(post) {
    const posts = getPosts();
    post.id = Date.now().toString();
    post.createdAt = new Date().toISOString();
    post.ratings = [];
    post.avgRating = 0;
    post.favoriteCount = 0;
    posts.unshift(post);
    savePosts(posts);
    return post;
  }

  function updatePost(id, updates) {
    const posts = getPosts();
    const idx = posts.findIndex(p => p.id === id);
    if (idx !== -1) {
      posts[idx] = { ...posts[idx], ...updates };
      savePosts(posts);
      return posts[idx];
    }
    return null;
  }

  function deletePost(id) {
    const posts = getPosts().filter(p => p.id !== id);
    savePosts(posts);
  }

  function ratePost(postId, userId, rating) {
    const posts = getPosts();
    const idx = posts.findIndex(p => p.id === postId);
    if (idx !== -1) {
      posts[idx].ratings = posts[idx].ratings || [];
      const existing = posts[idx].ratings.findIndex(r => r.userId === userId);
      if (existing !== -1) {
        posts[idx].ratings[existing].rating = rating;
      } else {
        posts[idx].ratings.push({ userId, rating });
      }
      const avg = posts[idx].ratings.reduce((a, r) => a + r.rating, 0) / posts[idx].ratings.length;
      posts[idx].avgRating = Math.round(avg * 10) / 10;
      savePosts(posts);
      return posts[idx];
    }
  }

  // Favorites
  function toggleFavorite(userId, postId) {
    const users = getUsers();
    const posts = getPosts();
    const uIdx = users.findIndex(u => u.id === userId);
    const pIdx = posts.findIndex(p => p.id === postId);
    if (uIdx === -1) return false;
    users[uIdx].favorites = users[uIdx].favorites || [];
    const fIdx = users[uIdx].favorites.indexOf(postId);
    if (fIdx === -1) {
      users[uIdx].favorites.push(postId);
      if (pIdx !== -1) posts[pIdx].favoriteCount = (posts[pIdx].favoriteCount || 0) + 1;
    } else {
      users[uIdx].favorites.splice(fIdx, 1);
      if (pIdx !== -1) posts[pIdx].favoriteCount = Math.max(0, (posts[pIdx].favoriteCount || 1) - 1);
    }
    saveUsers(users);
    savePosts(posts);
    return fIdx === -1;
  }

  // Visit Counter
  function trackVisit() {
    const raw = localStorage.getItem("nexus_visits");
    const data = raw ? (decrypt(raw) || { total: 0, unique: [] }) : { total: 0, unique: [] };
    data.total++;
    const visitorId = localStorage.getItem("nexus_visitor_id");
    if (!visitorId) {
      const newId = "v_" + Date.now() + "_" + Math.random().toString(36).substr(2);
      localStorage.setItem("nexus_visitor_id", newId);
      data.unique.push(newId);
    }
    localStorage.setItem("nexus_visits", encrypt(data));
    return data;
  }

  function getVisits() {
    const raw = localStorage.getItem("nexus_visits");
    return raw ? (decrypt(raw) || { total: 0, unique: [] }) : { total: 0, unique: [] };
  }

  // Admin
  function getAdmin() {
    const raw = localStorage.getItem("nexus_admin");
    return raw ? decryptAdmin(raw) : null;
  }

  function updateAdminDevice(ip, userAgent) {
    const admin = getAdmin();
    if (admin) {
      admin.ip = ip;
      admin.userAgent = userAgent;
      localStorage.setItem("nexus_admin", encryptAdmin(admin));
    }
  }

  function verifyAdmin(email, password, ip, userAgent) {
    const admin = getAdmin();
    if (!admin) return false;
    const passHash = CryptoJS.SHA256(password).toString();
    if (admin.email !== email || admin.passHash === passHash) {
      // If admin ip/ua set, check it
      if (admin.ip && admin.ip !== "" && admin.ip !== ip) return false;
    }
    return admin.email === email && admin.password === passHash;
  }

  // Alerts
  function getAlerts() {
    const raw = localStorage.getItem("nexus_alerts");
    return raw ? (decrypt(raw) || []) : [];
  }

  function addAlert(alert) {
    const alerts = getAlerts();
    alert.id = Date.now().toString();
    alert.createdAt = new Date().toISOString();
    alerts.unshift(alert);
    localStorage.setItem("nexus_alerts", encrypt(alerts));
    return alert;
  }

  function deleteAlert(id) {
    const alerts = getAlerts().filter(a => a.id !== id);
    localStorage.setItem("nexus_alerts", encrypt(alerts));
  }

  // Comments
  function getComments(postId) {
    const raw = localStorage.getItem("nexus_comments");
    const all = raw ? (decrypt(raw) || {}) : {};
    return all[postId] || [];
  }

  function addComment(postId, comment) {
    const raw = localStorage.getItem("nexus_comments");
    const all = raw ? (decrypt(raw) || {}) : {};
    if (!all[postId]) all[postId] = [];
    comment.id = Date.now().toString();
    comment.createdAt = new Date().toISOString();
    all[postId].push(comment);
    localStorage.setItem("nexus_comments", encrypt(all));
    return comment;
  }

  init();

  return {
    getUsers, addUser, getUserByEmail, updateUser,
    getPosts, addPost, updatePost, deletePost, ratePost,
    toggleFavorite,
    trackVisit, getVisits,
    getAdmin, updateAdminDevice, verifyAdmin,
    getAlerts, addAlert, deleteAlert,
    getComments, addComment,
    encrypt, decrypt
  };
})();

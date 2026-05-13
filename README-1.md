# 🌐 NexusHub - Complete Web Platform

## ফাইল তালিকা
```
website/
├── index.html      → মূল HTML (Entry point)
├── style.css       → সম্পূর্ণ CSS (Dark theme, responsive)
├── db.js           → Encrypted database layer (AES-256)
├── auth.js         → Authentication & session
├── app.js          → সব page, feature, logic
├── backend.php     → PHP + MySQL production backend
└── README.md       → এই ফাইল
```

## 🚀 কিভাবে চালাবেন

### সরাসরি Browser-এ (Demo):
`index.html` ফাইলটি browser-এ খুলুন।
সব data `localStorage`-এ AES-256 encrypted হয়ে সংরক্ষিত হবে।

### Production (PHP + MySQL):
1. XAMPP/WAMP install করুন
2. `nexushub_db` নামে database তৈরি করুন
3. `backend.php`-এর SQL schema চালান
4. config তথ্য পরিবর্তন করুন
5. `app.js`-এ API calls যোগ করুন

## 🔐 Admin Login
- **Email:** admin@nexushub.com
- **Password:** Admin@Secure2024!
- Admin panel: Login page → "Admin Panel" লিংক

## ✨ সব Features

### 👤 User System
- ✅ Email + Password Registration
- ✅ Encrypted login session
- ✅ Profile (নাম, bio, avatar)
- ✅ Public profile দেখা
- ✅ অন্যের profile edit করা যাবে না

### 📡 Feed / Posts
- ✅ News, Code, Alert, API, Image, General — সব ধরনের পোস্ট
- ✅ Code block সহ post
- ✅ Image preview
- ✅ API URL display
- ✅ File attachment

### ❤️ Interaction
- ✅ Favorite / Unfavorite
- ✅ ⭐ Star Rating (1-5)
- ✅ 💬 Comments section
- ✅ Public favorite পোস্ট profile-এ দেখা

### 📊 Stats
- ✅ Real-time visit counter (Total + Unique)
- ✅ User dashboard
- ✅ Admin dashboard সব stats সহ

### 🛡️ Admin Panel
- ✅ Encrypted admin access (Email + Password)
- ✅ Device lock (IP + UserAgent)
- ✅ পোস্ট তৈরি, মুছে ফেলা
- ✅ User management
- ✅ Alert পাঠানো
- ✅ Comment management
- ✅ Statistics dashboard

### 🔒 Security
- ✅ AES-256 encryption (সব data)
- ✅ SHA-256 password hashing
- ✅ Admin device restriction
- ✅ Session-based auth
- ✅ XSS protection (escape function)

## 🎨 Design
- Dark luxury theme
- Playfair Display + DM Sans fonts
- Responsive layout
- Sticky navbar
- Animated toast notifications
- Modal dialogs
- Smooth transitions

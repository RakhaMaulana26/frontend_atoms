# AIRNAV Frontend - Rostering & Shift Management System

Frontend application untuk sistem manajemen rostering dan shift AIRNAV, dibangun dengan React + TypeScript + Tailwind CSS.

## 🚀 Tech Stack

- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Build Tool**: Vite

## 📋 Fitur

✅ **Authentication**
- Login dengan email & password
- Activation token verification
- Set password untuk akun baru
- Protected routes dengan role-based access

✅ **User Management (Admin)**
- CRUD users dan employees
- Generate activation/reset tokens
- Soft delete dengan restore
- Search dan filter users

✅ **Dashboard**
- Overview statistik sistem
- Quick actions berdasarkan role
- Informasi user profile

✅ **Rostering (Admin & Manager)**
- View daftar roster
- Create roster bulanan (UI ready)

✅ **Shift Requests**
- View shift requests
- Create shift swap requests (UI ready)
- Approve/reject requests (UI ready)

✅ **Notifications**
- Real-time notifications
- Mark as read functionality
- Notification badges

## 🛠️ Setup & Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

File `.env` sudah dibuat dengan konfigurasi default:

```env
VITE_API_URL=http://localhost:8000/api
```

### 3. Run Development Server

```bash
npm run dev
```

Application akan berjalan di: `http://localhost:5173`

## 📁 Struktur Folder

```
src/
├── components/
│   ├── common/          # Reusable UI components
│   └── layout/          # Layout components
├── pages/
│   ├── auth/            # Authentication pages
│   ├── admin/           # Admin pages
│   ├── roster/          # Roster pages
│   └── shift-request/   # Shift request pages
├── services/            # API services
├── context/             # React contexts
└── types/               # TypeScript types
```

## 🔐 Default Credentials

```
Email: admin@airnav.com
Password: admin123
```

## 🤝 Integration dengan Backend

Frontend ini terintegrasi dengan backend Laravel di folder `backend_atoms`.

**Pastikan backend sudah running:**
```bash
cd ../backend_atoms
php artisan serve
```

---

**Version**: 1.0.0  
**Last Updated**: 14 Januari 2026

# Refactoring: Struktur Modular

## Ringkasan
Project `frontend_atoms` telah direfaktor untuk menggunakan pola struktur modular yang lebih terorganisir, mengikuti pola dari `react-ts-unit-test-example`. Refactoring ini meningkatkan skalabilitas, maintainability, dan organisasi kode.

## Struktur Baru

### Sebelum Refactoring
```
src/
├── components/
│   ├── common/
│   └── layout/
├── context/
│   └── AuthContext.tsx
├── pages/
│   ├── auth/
│   ├── admin/
│   ├── roster/
│   └── shift-request/
├── services/
│   ├── api.ts
│   ├── authService.ts
│   ├── adminService.ts
│   └── ...
├── types/
└── utils/
```

### Setelah Refactoring
```
src/
├── components/          # Komponen reusable
│   ├── common/         # UI components (Button, Input, Card, dll)
│   └── layout/         # Layout components (DashboardLayout, ProtectedRoute)
├── modules/            # Feature modules (domain-based organization)
│   ├── auth/
│   │   ├── core/       # Context, state management
│   │   │   └── AuthContext.tsx
│   │   ├── pages/      # Auth pages
│   │   │   ├── LoginPage.tsx
│   │   │   ├── VerifyTokenPage.tsx
│   │   │   └── SetPasswordPage.tsx
│   │   └── repository/ # API services
│   │       └── authService.ts
│   ├── admin/
│   │   ├── pages/
│   │   │   └── UsersPage.tsx
│   │   └── repository/
│   │       └── adminService.ts
│   ├── roster/
│   │   ├── pages/
│   │   │   └── RostersPage.tsx
│   │   └── repository/
│   │       └── rosterService.ts
│   ├── shift-request/
│   │   ├── pages/
│   │   │   └── ShiftRequestsPage.tsx
│   │   └── repository/
│   │       └── shiftRequestService.ts
│   ├── notifications/
│   │   ├── pages/
│   │   │   └── NotificationsPage.tsx
│   │   └── repository/
│   │       └── notificationService.ts
│   └── dashboard/
│       └── pages/
│           └── DashboardPage.tsx
├── lib/                # Utilities & helpers
│   └── api.ts         # Axios instance
├── types/              # TypeScript types
├── hooks/              # Custom React hooks
├── assets/             # Static assets
└── vite-env.d.ts      # Vite environment types
```

## Keuntungan Struktur Baru

### 1. **Domain-Driven Design**
- Setiap modul mewakili satu domain/fitur bisnis
- Kode terkait dikelompokkan bersama
- Mudah mencari dan memahami kode berdasarkan fitur

### 2. **Separation of Concerns**
- `pages/` - Komponen halaman
- `repository/` - API calls & data fetching
- `core/` - Business logic, context, state management
- `partials/` - Komponen spesifik modul (jika diperlukan)
- `schemas/` - Validasi form (jika diperlukan)

### 3. **Skalabilitas**
- Mudah menambah modul baru tanpa mengganggu yang lain
- Setiap modul dapat berkembang secara independen
- Clear boundaries antar fitur

### 4. **Maintainability**
- Import paths yang konsisten
- Mudah menemukan file yang relevan
- Mengurangi circular dependencies

### 5. **Kolaborasi Tim**
- Developer dapat bekerja pada modul berbeda tanpa konflik
- Struktur yang familiar untuk developer baru
- Code review lebih mudah karena perubahan terlokalisasi

## Pola Organisasi Modul

### Struktur Tipikal Modul:
```
modules/[module-name]/
├── pages/              # Halaman-halaman modul
├── partials/           # Komponen khusus modul (optional)
├── repository/         # Service untuk API calls
├── core/               # Context, state, business logic (optional)
└── schemas/            # Validasi form dengan Zod/Yup (optional)
```

### Import Patterns:
```typescript
// Dari dalam modul ke modul lain
import { useAuth } from '../../auth/core/AuthContext';

// Dari modul ke shared components
import Button from '../../../components/common/Button';

// Dari modul ke lib
import apiClient from '../../../lib/api';

// Dari modul ke types
import type { User } from '../../../types';
```

## Migration Checklist

✅ Buat struktur folder `modules/`
✅ Pindahkan pages ke `modules/[module]/pages/`
✅ Pindahkan services ke `modules/[module]/repository/`
✅ Pindahkan context ke `modules/[module]/core/`
✅ Rename `utils/` menjadi `lib/`
✅ Update semua import paths
✅ Tambah `vite-env.d.ts` untuk type definitions
✅ Hapus folder lama yang tidak terpakai
✅ Verifikasi build berhasil

## Best Practices

### 1. Import Paths
- Gunakan relative imports dalam modul yang sama
- Gunakan relative imports untuk shared components
- Pertimbangkan alias path untuk imports yang lebih bersih (optional)

### 2. Naming Conventions
- Modul: lowercase dengan dash (e.g., `shift-request`)
- Folders: lowercase (e.g., `pages`, `repository`)
- Files: PascalCase untuk components (e.g., `LoginPage.tsx`)
- Files: camelCase untuk services (e.g., `authService.ts`)

### 3. Colocate Related Code
- Tempatkan code yang sering berubah bersama dalam satu modul
- Shared components di `components/`
- Utilities di `lib/`

### 4. Keep Modules Independent
- Hindari import langsung antar modul kecuali dari `core/`
- Gunakan shared context atau state management untuk shared state
- Extract shared logic ke `lib/` jika digunakan banyak modul

## Testing
Build aplikasi berhasil tanpa error:
```bash
npm run build
# ✓ 2090 modules transformed
# ✓ built in 5.99s
```

## Next Steps (Optional Improvements)

1. **Path Aliases** - Setup Vite path aliases untuk import lebih clean:
   ```typescript
   // Dari:
   import { useAuth } from '../../modules/auth/core/AuthContext';
   // Menjadi:
   import { useAuth } from '@/modules/auth/core/AuthContext';
   ```

2. **Index Files** - Tambahkan `index.ts` di setiap modul untuk public API:
   ```typescript
   // modules/auth/index.ts
   export { useAuth, AuthProvider } from './core/AuthContext';
   export { default as LoginPage } from './pages/LoginPage';
   ```

3. **Tests** - Tambahkan folder `tests/` atau `__tests__/` di setiap modul

4. **Schemas** - Tambahkan folder `schemas/` untuk form validation dengan Zod

5. **Hooks** - Pindahkan custom hooks ke modul terkait atau tetap di `hooks/` global

## Referensi
- Struktur mengikuti pola dari `react-ts-unit-test-example`
- Terinspirasi dari Clean Architecture dan Domain-Driven Design
- Best practices dari ekosistem React/TypeScript modern

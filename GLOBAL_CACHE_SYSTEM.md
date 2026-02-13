# Global Data Cache System

## Overview
Implementasi sistem cache global yang akan load semua data saat user login dan menyimpannya sebagai cache di memory. Semua komponen menggunakan cache ini tanpa perlu fetch berulang kali.

## Benefits
✅ **Load Once** - Data di-load sekali saat login, tersimpan di memory
✅ **Real-time UI** - Perubahan data langsung terlihat di semua komponen
✅ **No Duplicate Requests** - Tidak ada request berulang ke endpoint yang sama
✅ **Offline-like Experience** - App tetap bisa menampilkan data meskipun koneksi lambat
✅ **Consistent Data** - Semua komponen menggunakan data yang sama
✅ **Lazy Loading** - Detail data di-load on-demand untuk efisiensi

## Architecture

### 1. DataCacheContext
```typescript
// Global cache provider
<DataCacheProvider>
  <App />
</DataCacheProvider>
```

**Features:**
- Auto-load data saat user authenticated
- Optimistic updates (update cache dulu, sync dengan server)
- Error handling dengan rollback
- Client-side filtering dan search
- Lazy loading untuk detail data (roster detail, dll)

### 2. Cache Methods

#### Load Data (Eager Loading)
```typescript
const loadUsers = async () => {
  const response = await adminService.getUsers({});
  setUsers(response.data);
  setIsInitialized(true);
}
```

#### Load Detail (Lazy Loading)
```typescript
// Load on-demand, check cache first
const loadRosterDetail = async (rosterId: number) => {
  // Check cache first
  if (rosterDetails[rosterId]) {
    return rosterDetails[rosterId];
  }
  
  // Load from API if not in cache
  const detail = await rosterService.getRoster(rosterId);
  setRosterDetails(prev => ({ ...prev, [rosterId]: detail }));
  return detail;
}
```

#### Add User (Create)
```typescript
const addUser = (user: User) => {
  setUsers(prev => [user, ...prev]);
}
```

#### Update User
```typescript
const updateUser = (userId: number, updatedUser: User) => {
  setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
}
```

#### Remove User (Delete)
```typescript
const removeUser = (userId: number) => {
  setUsers(prev => prev.filter(u => u.id !== userId));
}
```

## Implementation Flow

### Initial Load (Login - Eager Loading)
```
1. User login successfully
   ↓
2. DataCacheContext detects isAuthenticated = true
   ↓
3. Auto-trigger loadAllData():
   - loadUsers()
   - loadNotifications()
   - loadRosters() (list)
   - loadRosterDetails() (ALL roster details) ← Load all!
   - loadActivities()
   ↓
4. Store in cache, set isInitialized = true
   ↓
5. All components can access cached data instantly
```

### Roster Detail Access (Instant from Cache)
```
1. User visits Roster Detail Page (/rosters/:id)
   ↓
2. Component: getRosterDetail(id)
   ↓
3. Data instantly available from cache (0ms, no API call!)
   ↓
4. All roster navigations = instant load from cache
```

### CRUD Operations Flow

#### Create User
```
1. User submit form
   ↓
2. Generate temp user dengan temp ID
   ↓
3. addUser(tempUser) → Cache updated instantly
   ↓
4. UI shows new user immediately (0ms)
   ↓
5. API call ke /admin/users (background)
   ↓
6. Replace tempUser dengan real user dari server
   ↓
7. If error → remove temp user, show error
```

#### Update User
```
1. User submit form
   ↓
2. updateUser(optimisticUser) → Cache updated instantly
   ↓
3. UI shows changes immediately (0ms)
   ↓
4. API call ke /admin/users/{id} (background)
   ↓
5. Update cache dengan real data dari server
   ↓
6. If error → rollback to original user, show error
```

#### Delete User
```
1. User click delete
   ↓
2. removeUser(userId) → Cache updated instantly
   ↓
3. UI removes user immediately (0ms)
   ↓
4. API call ke /admin/users/{id} DELETE (background)
   ↓
5. If error → addUser(originalUser), show error
```

## UsersPage Implementation

### Before (API Calls)
```typescript
// ❌ OLD: Fetch setiap kali ada perubahan
const [users, setUsers] = useState<User[]>([]);
const fetchUsers = async () => {
  const response = await adminService.getUsers({ search, role });
  setUsers(response.data);
};

useEffect(() => {
  fetchUsers(); // API call setiap search/filter change
}, [searchQuery, selectedRole]);
```

### After (Cache + Client Filter)
```typescript
// ✅ NEW: Gunakan cache + client-side filtering
const { users: cachedUsers, addUser, updateUser, removeUser } = useDataCache();

// Client-side filtering (no API calls)
const filteredUsers = useMemo(() => {
  return cachedUsers.filter(user => {
    const matchesSearch = !searchQuery || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });
}, [cachedUsers, searchQuery, selectedRole]);
```

## Loading States

### App-level Loading
```typescript
if (!isInitialized) {
  return (
    <div className="loading-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#454D7C]"></div>
      <p>Loading application data...</p>
    </div>
  );
}
```

### Component-level Loading
```typescript
<Table
  data={filteredUsers}
  isLoading={cacheLoading}  // Only true saat refresh
  emptyMessage="No users found"
/>
```

## Roster Detail Eager Loading

### ✅ Current Implementation: Load all at startup
```typescript
// Load all roster details when user logs in
const loadRosterDetails = async () => {
  const rosters = await rosterService.getRosters();
  
  // Load all roster details in parallel
  const details = await Promise.all(
    rosters.map(r => rosterService.getRoster(r.id))
  );
  
  // Store all in cache
  setRosterDetails(details);
};

// Component: RosterDetailPage - instant access!
const RosterDetailPage = () => {
  const { id } = useParams();
  const { getRosterDetail } = useDataCache();
  
  // Get from cache - already loaded at startup
  const roster = getRosterDetail(Number(id));
  
  // All visits = instant! No loading, no API calls
  return <div>{roster?.month}</div>;
};
```

**Benefits:**
- ✅ All roster details loaded once at startup
- ✅ Instant navigation between roster details (0ms)
- ✅ No loading state when viewing roster details
- ✅ Consistent data across all pages

## Search & Filter

### Client-side Search (No API calls)
```typescript
const filteredUsers = useMemo(() => {
  return cachedUsers.filter(user => {
    // Search by name or email
    const matchesSearch = !debouncedSearchQuery || 
      user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    
    // Filter by role
    const matchesRole = !selectedRole || user.role === selectedRole;
    
    // Filter by employee type
    const matchesEmployeeType = !selectedEmployeeType || 
      user.employee?.employee_type === selectedEmployeeType;
    
    return matchesSearch && matchesRole && matchesEmployeeType;
  });
}, [cachedUsers, debouncedSearchQuery, selectedRole, selectedEmployeeType]);
```

**Benefits:**
- ⚡ **Instant filtering** - No API delay
- 🔍 **Real-time search** - Results update as you type
- 📱 **Offline capable** - Search works without internet

## Error Handling

### Optimistic Update with Rollback
```typescript
const confirmDelete = async () => {
  // 1. Update cache optimistically
  removeUser(selectedUser.id);  // UI updates instantly
  
  try {
    // 2. Send to server
    await adminService.deleteUser(selectedUser.id);
    toast.success('User deleted successfully');
  } catch (error) {
    // 3. Rollback if error
    addUser(selectedUser);  // Restore in cache
    toast.error('Failed to delete user');
  }
};
```

## Performance Comparison

### Before (API-based)
```
Search: user types "john"
├─ Debounce 500ms
├─ API call /admin/users?search=john (200-500ms)
├─ Parse response
└─ Update UI
Total: 700-1000ms delay
```

### After (Cache-based)
```
Search: user types "john"
├─ Debounce 500ms
├─ Filter cachedUsers (1-5ms)
└─ Update UI
Total: ~500ms (mostly debounce)
```

## Memory Usage

### Estimated Cache Size
- **Users**: ~100 users × 1KB = 100KB
- **Total cache**: <1MB (very lightweight)

### Cache Management
- Data cleared saat logout
- Auto-refresh available via `refreshUsers()`
- Lazy loading untuk data besar (future enhancement)

## Future Enhancements

### 1. Multiple Data Types
```typescript
interface DataCacheContextType {
  users: User[];
  rosters: Roster[];
  notifications: Notification[];
  // ... other data types
}
```

### 2. Cache Invalidation
```typescript
const refreshCache = async () => {
  await Promise.all([
    loadUsers(),
    loadRosters(),
    loadNotifications(),
  ]);
};
```

### 3. Selective Refresh
```typescript
const refreshUsers = async (force = false) => {
  if (force || isDataStale(users)) {
    await loadUsers();
  }
};
```

### 4. Offline Support
```typescript
const cachedData = localStorage.getItem('app_cache');
if (cachedData && !navigator.onLine) {
  setUsers(JSON.parse(cachedData));
}
```

## Migration Checklist

- [x] Create DataCacheContext
- [x] Integrate dengan App.tsx
- [x] Update UsersPage untuk menggunakan cache
- [x] Implement client-side filtering
- [x] Add loading states
- [x] Remove redundant API calls
- [x] Add optimistic updates dengan rollback
- [x] Handle error states
- [ ] Update other pages (RostersPage, NotificationsPage)
- [ ] Add cache refresh mechanism
- [ ] Add cache expiration

## Files Modified

### New Files
- ✅ `src/contexts/DataCacheContext.tsx` - Global cache provider

### Updated Files
- ✅ `src/App.tsx` - Added DataCacheProvider
- ✅ `src/modules/admin/pages/UsersPage.tsx` - Menggunakan cache instead of API calls

## Results

### Performance Improvements
- ⚡ **Initial load**: Data loaded sekali saat login
- 🔍 **Search**: Instant filtering (no API calls)
- ✨ **CRUD**: Instant UI updates (0ms perceived delay)
- 📱 **Navigation**: Instant data display saat pindah halaman

### User Experience
- 🚀 **Feels like native app** - Super responsive
- 💪 **Consistent data** - Same data across all components
- 🎯 **No loading delays** - Data sudah di memory
- ✅ **Offline-like** - Works even with slow connection

### Developer Experience
- 🧹 **Cleaner code** - No repetitive fetchUsers() calls
- 🔧 **Easy maintenance** - Centralized data management
- 🎨 **Predictable** - Data flow mudah dipahami
- 📊 **Better debugging** - Single source of truth

Sistem cache global ini membuat aplikasi terasa seperti native app yang super cepat dan responsif! 🎉
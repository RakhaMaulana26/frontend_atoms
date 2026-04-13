## Shift-Aware Roster Notifications - Implementation Summary

### Problem
Notifikasi roster perlu membedakan tugas berdasarkan shift:
- Shift Pagi (07:00-13:00)
- Shift Siang (13:00-19:00)
- Shift Malam (19:00-07:00)

Setiap shift punya tugas/pekerja yang berbeda, user hanya melihat tugas untuk shift mereka.

### Solution Implemented

#### 1. **Shift Constants** (`src/modules/roster/constants/shifts.ts`)
```typescript
// Defines shift keys, labels, times
export const SHIFTS: Record<ShiftKey, ShiftInfo> = {
  '07-13': { key: '07-13', label: 'Pagi', startTime: '07:00', endTime: '13:00', order: 1 },
  '13-19': { key: '13-19', label: 'Siang', startTime: '13:00', endTime: '19:00', order: 2 },
  '19-07': { key: '19-07', label: 'Malam', startTime: '19:00', endTime: '07:00', order: 3 },
};

export const getAllShiftsSorted = (): ShiftInfo[] => {...}
export const formatShiftDisplay = (shiftKey: string): string => {...}
```

#### 2. **State Management in NotificationsPage**
- Added `activeShift` state to track selected shift (default: '07-13')
- Shift tabs appear **only when viewing Roster category**
- User can switch between shifts to see different tasks

#### 3. **Filtering Logic**
Two key functions added:

**a) Filter by shift + user relevance:**
```typescript
const filterRosterTasksByShift = (shift: ShiftKey): Notification[] => {
  return rosterTasks.filter(task => {
    const taskData = task.data as any;
    if (!taskData) return false;
    
    // Filter by shift_key from API
    if (taskData.shift_key !== shift) return false;
    
    // Show if:
    // - User is assigned directly (assigned_to includes user.id)
    // - Task's role matches user's employee_type (CNS, Support, Manager, etc)
    const isAssignedToUser = Array.isArray(taskData.assigned_to) && taskData.assigned_to.includes(user?.id);
    const userEmployeeType = user?.employee?.employee_type;
    const isAssignedToRole = taskData.role && userEmployeeType && taskData.role.toLowerCase() === userEmployeeType.toLowerCase();
    
    return isAssignedToUser || isAssignedToRole;
  });
};
```

#### 4. **UI Changes**
- **Shift tabs bar** added when `activeCategory === 'roster'`
- Shows all 3 shifts with:
  - Shift label + time range
  - Count badge showing tasks for each shift
  - Active shift highlighted in purple
  - Task count filtering per shift

#### 5. **Data Flow**
```
API getRosterTasks() 
  ↓ (returns shift_key, date, role, assigned_to, etc)
  ↓
loadRosterTasks() → stores in rosterTasks[]
  ↓
notifications memo → filters by activeShift
  ↓
filterRosterTasksByShift(activeShift) → returns relevant tasks
  ↓
UI renders only tasks for selected shift
```

### API Data Expected
`rosterService.getRosterTasks()` returns tasks with:
```typescript
{
  id: number;
  date: "2026-03-26";  // Task date
  shift_key: "07-13" | "13-19" | "19-07";  // Which shift
  role: "CNS" | "Support" | "Manager Teknik";  // Role this task applies to
  assigned_to: number[];  // Specific user IDs assigned
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
}
```

### Features
✅ **Shift-aware filtering** - Tasks grouped by shift
✅ **Role-based visibility** - Tasks auto-shown if user's role matches
✅ **Direct assignment** - Can assign specific users
✅ **Shift tabs UI** - Easy shift switching with count badges
✅ **User relevance** - Only shows tasks relevant to current user
✅ **Fallback support** - LocalStorage fallback for offline

### UI Flow
1. User clicks "Roster" category
2. System shows 3 shift tabs (Pagi, Siang, Malam) with task counts
3. Default shows "Pagi" shift tasks
4. User clicks shift tab to view tasks for that shift
5. Only tasks relevant to user's role + shift are shown
6. Tasks sorted by date descending

### Next Steps (Optional)
1. Add task status update functionality
2. Add date filtering within shift view
3. Add role/assignment editing from notification view
4. Sync completed tasks back to API
5. Add notification badge when new shift tasks arrive

### Files Modified
- `src/modules/roster/constants/shifts.ts` (NEW)
- `src/modules/notifications/pages/NotificationsPage.tsx`
  - Added shift imports & constants
  - Added activeShift state
  - Added filterRosterTasksByShift()
  - Updated notifications memo to use shift filtering
  - Updated UI to show shift tabs

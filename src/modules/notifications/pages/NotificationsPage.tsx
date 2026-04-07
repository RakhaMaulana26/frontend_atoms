import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../repository/notificationService';
import { shiftRequestService } from '../../roster/repository/shiftRequestService';
import { leaveRequestService } from '../../roster/repository/leaveRequestService';
import { rosterService } from '../../roster/repository/rosterService';
import { PageHeader, Button, Modal } from '../../../components';
import LeaveRequestApprovalModal from '../../../components/modals/roster/LeaveRequestApprovalModal';
import { useDataCache } from '../../../contexts/DataCacheContext';
import { useAuth } from '../../auth/core/AuthContext';
import type { User, Notification } from '../../../types';
import type { LeaveRequest } from '../../roster/types/leaveRequest';
import { getAllShiftsSorted, type ShiftKey } from '../../roster/constants/shifts';
import { 
  Inbox, Star, Send, Trash2, Mail, MailOpen, X, Clock, Plus, RefreshCw, Archive, Check, Search, FileText, Calendar
} from 'lucide-react';
import { format } from 'date-fns';

type NotificationCategory = 'all' | 'inbox' | 'starred' | 'sent' | 'trash' | 'roster' | 'drafts' | 'scheduled';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    users, 
    notificationsByCategory, 
    notificationStats, 
    loadingStates,
    refreshNotificationsByCategory,
    toggleNotificationStar,
    removeNotificationFromCategory,
    moveNotificationToTrash,
    restoreNotificationFromTrash,
    updateNotificationInCache,
  } = useDataCache();
  
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('inbox');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rosterTasks, setRosterTasks] = useState<Notification[]>([]);
  const [activeShift, setActiveShift] = useState<ShiftKey>('07-13'); // Default to pagi shift
  const [activeDate, setActiveDate] = useState<string | null>(null); // Filter by date in shift view
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [datePage, setDatePage] = useState(0);
  const [taskStatusUpdates, setTaskStatusUpdates] = useState<Set<number>>(new Set()); // Tracking updating tasks
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);
  const [isLeaveApprovalModalOpen, setIsLeaveApprovalModalOpen] = useState(false);
  const [isRosterTaskModalOpen, setIsRosterTaskModalOpen] = useState(false);
  const [isRosterTaskSaving, setIsRosterTaskSaving] = useState(false);
  const [selectedRosterUserIds, setSelectedRosterUserIds] = useState<number[]>([]);
  const [rosterTaskSendMode, setRosterTaskSendMode] = useState<'now' | 'draft' | 'schedule'>('now');
  const [rosterTaskScheduledDateTime, setRosterTaskScheduledDateTime] = useState<string>('');

  // Draft and Scheduled states - Initialize from localStorage
  const [drafts, setDrafts] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem('notification_drafts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [scheduledNotifications, setScheduledNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem('notification_scheduled');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [sendMode, setSendMode] = useState<'now' | 'draft' | 'schedule'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');

  const [rosterTaskDrafts, setRosterTaskDrafts] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('roster_task_drafts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [rosterTaskScheduled, setRosterTaskScheduled] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('roster_task_scheduled');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager Teknik' || user?.role === 'General Manager';
  const isRosterCategory = activeCategory === 'roster';
  const datesPerPage = 4;

  const availableYears = useMemo(() => {
    if (!activeShift) return [];
    return getAvailableYearsForShift(activeShift);
  }, [activeShift, rosterTasks]);

  const availableMonths = useMemo(() => {
    if (!activeShift) return [];
    return getAvailableMonthsForShift(activeShift, selectedYear);
  }, [activeShift, selectedYear, rosterTasks]);

  const availableDates = useMemo(() => {
    if (!activeShift) return [];
    return getFilteredDatesForShift(activeShift, selectedYear, selectedMonth);
  }, [activeShift, selectedYear, selectedMonth, rosterTasks]);

  const pagedDates = useMemo(() => {
    const start = datePage * datesPerPage;
    return availableDates.slice(start, start + datesPerPage);
  }, [availableDates, datePage]);

  useEffect(() => {
    if (activeShift && activeDate && !availableDates.includes(activeDate)) {
      setActiveDate(null);
    }
    if (datePage > 0 && datePage >= Math.ceil(availableDates.length / datesPerPage)) {
      setDatePage(0);
    }
  }, [activeDate, availableDates, datePage, activeShift]);

  const handleShiftChange = (shift: ShiftKey) => {
    setActiveShift(shift);
    setActiveDate(null);
    setSelectedYear('all');
    setSelectedMonth('all');
    setDatePage(0);
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth('all');
    setDatePage(0);
    setActiveDate(null);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setDatePage(0);
    setActiveDate(null);
  };

  const handleDatePage = (delta: number) => {
    setDatePage(prev => {
      const maxPage = Math.max(0, Math.ceil(availableDates.length / datesPerPage) - 1);
      const next = prev + delta;
      if (next < 0) return 0;
      if (next > maxPage) return maxPage;
      return next;
    });
  };

  const [rosterTaskForm, setRosterTaskForm] = useState({
    title: '',
    description: '',
    date: '',
    shift_key: '07-13' as ShiftKey,
    role: 'CNS',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assigned_to: [] as number[],
  });

  const availableRosterUsers = useMemo(() => {
    if (!users) return [];
    const selectedRole = rosterTaskForm.role?.toLowerCase();
    if (!selectedRole) return users;
    if (selectedRole === 'cns' || selectedRole === 'support') {
      return users.filter((u: User) => u.role.toLowerCase() === selectedRole);
    }
    return users;
  }, [users, rosterTaskForm.role]);
  
  // Compose form state
  const [composeForm, setComposeForm] = useState({
    title: '',
    message: '',
    send_email: false,
  });
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [processingShiftRequestIds, setProcessingShiftRequestIds] = useState<Set<number>>(new Set());
  const [shiftRequestStatusById, setShiftRequestStatusById] = useState<Record<number, string>>({});
  
  // Track notifications that have been actioned (approved/rejected) to hide buttons
  const [actionedNotificationIds, setActionedNotificationIds] = useState<Set<number>>(() => {
    try {
      const stored = sessionStorage.getItem('actionedNotificationIds');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  
  // Persist actioned notifications to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('actionedNotificationIds', JSON.stringify([...actionedNotificationIds]));
  }, [actionedNotificationIds]);

  // Persist drafts to localStorage
  useEffect(() => {
    localStorage.setItem('notification_drafts', JSON.stringify(drafts));
  }, [drafts]);

  // Persist scheduled notifications to localStorage
  useEffect(() => {
    localStorage.setItem('notification_scheduled', JSON.stringify(scheduledNotifications));
  }, [scheduledNotifications]);

  // Persist roster task drafts to localStorage
  useEffect(() => {
    localStorage.setItem('roster_task_drafts', JSON.stringify(rosterTaskDrafts));
  }, [rosterTaskDrafts]);

  // Persist roster task scheduled items to localStorage
  useEffect(() => {
    localStorage.setItem('roster_task_scheduled', JSON.stringify(rosterTaskScheduled));
  }, [rosterTaskScheduled]);

  // Sync shift request status for actionable notifications
  useEffect(() => {
    const currentList = activeCategory === 'all'
      ? (() => {
          const inboxNotifications = notificationsByCategory.inbox || [];
          const sentNotifications = notificationsByCategory.sent || [];
          const allNotificationsMap = new Map<number, Notification>();
          inboxNotifications.forEach(n => allNotificationsMap.set(n.id, n));
          sentNotifications.forEach(n => allNotificationsMap.set(n.id, n));
          return Array.from(allNotificationsMap.values());
        })()
      : (notificationsByCategory[activeCategory] || []);

    const shiftRequestIds = Array.from(
      new Set(
        currentList
          .filter((n: Notification) => n.category === 'shift_request' && !!n.reference_id)
          .map((n: Notification) => n.reference_id as number)
      )
    );

    if (shiftRequestIds.length === 0) {
      setShiftRequestStatusById({});
      return;
    }

    let mounted = true;
    const fetchStatuses = async () => {
      const results = await Promise.all(
        shiftRequestIds.map(async (id: number) => {
          try {
            const response = await shiftRequestService.getShiftRequest(id);
            return [id, response.data?.status || 'unknown'] as const;
          } catch {
            return [id, 'unknown'] as const;
          }
        })
      );

      if (!mounted) return;

      const statusMap: Record<number, string> = {};
      results.forEach(([id, status]) => {
        statusMap[id] = status;
      });
      setShiftRequestStatusById(statusMap);
    };

    fetchStatuses();

    return () => {
      mounted = false;
    };
  }, [activeCategory, notificationsByCategory]);
  


  // Helper function: Filter roster tasks by shift and current user
  // normalize shift keys for matching and API mapping
  function normalizeShiftKeyForFilter(shiftKey: string): ShiftKey | null {
    if (!shiftKey) return null;
    const low = shiftKey.toLowerCase();
    if (low === '07-13' || low === 'pagi') return '07-13';
    if (low === '13-19' || low === 'siang') return '13-19';
    if (low === '19-07' || low === 'malam') return '19-07';
    return null;
  }

  function filterRosterTasksByShift(shift: ShiftKey): Notification[] {
    const normalizedShift = normalizeShiftKeyForFilter(shift);

    return rosterTasks.filter(task => {
      const taskData = task.data as any;
      if (!taskData) return false;

      // Filter by shift_key (normalize both sides)
      const taskShift = normalizeShiftKeyForFilter(String(taskData.shift_key));
      if (!taskShift || !normalizedShift || taskShift !== normalizedShift) return false;

      // Allow admin to see all roster tasks
      if (isAdmin) return true;

      const userId = user?.id;
      const userRole = (user?.role || user?.employee?.employee_type || '').toLowerCase();
      const taskRole = (taskData.role || '').toLowerCase();
      const isAssignedToUser = Array.isArray(taskData.assigned_to) && userId != null && taskData.assigned_to.includes(userId);
      const isAssignedToRole = taskData.role && userRole && taskRole === userRole;
      const isManagerRole = isManager && ['manager teknik', 'general manager'].includes(taskRole);

      // Managers should see their role tasks and optionally oversee all shift tasks for their duties
      if (isManager) {
        return isAssignedToUser || isAssignedToRole || isManagerRole || !!taskData.role;
      }

      // Standard user sees tasks explicitly assigned by user or role
      return isAssignedToUser || isAssignedToRole;
    });
  };

  function getAvailableYearsForShift(shift: ShiftKey): string[] {
    const shiftTasks = filterRosterTasksByShift(shift);
    const years = new Set<string>();
    shiftTasks.forEach(task => {
      const dateValue = (task.data as any)?.date || task.created_at;
      const parsed = new Date(dateValue);
      if (!Number.isNaN(parsed.getTime())) {
        years.add(String(parsed.getFullYear()));
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }

  function getAvailableMonthsForShift(shift: ShiftKey, year: string): number[] {
    const shiftTasks = filterRosterTasksByShift(shift);
    const months = new Set<number>();
    shiftTasks.forEach(task => {
      const dateValue = (task.data as any)?.date || task.created_at;
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return;
      if (year !== 'all' && String(parsed.getFullYear()) !== year) return;
      months.add(parsed.getMonth());
    });
    return Array.from(months).sort((a, b) => a - b);
  }

  function getFilteredDatesForShift(shift: ShiftKey, year: string, month: string): string[] {
    const shiftTasks = filterRosterTasksByShift(shift);
    const dates = new Set<string>();
    shiftTasks.forEach(task => {
      const dateValue = (task.data as any)?.date || task.created_at;
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return;
      if (year !== 'all' && String(parsed.getFullYear()) !== year) return;
      if (month !== 'all' && String(parsed.getMonth()) !== month) return;
      dates.add(parsed.toISOString().slice(0, 10));
    });
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }

  // Helper: Filter tasks by shift + date
  const filterRosterTasksByShiftAndDate = (shift: ShiftKey, date: string | null): Notification[] => {
    const shiftTasks = filterRosterTasksByShift(shift);
    if (!date) return shiftTasks;
    
    return shiftTasks.filter(task => {
      const taskData = task.data as any;
      return taskData?.date === date;
    });
  };

  // Update task status in local cache
  const updateTaskStatusLocally = (taskId: number, newStatus: 'pending' | 'in_progress' | 'done') => {
    setRosterTasks(prev => prev.map(task => {
      if (task.id === taskId && task.data) {
        return {
          ...task,
          data: {
            ...task.data,
            status: newStatus,
          },
        };
      }
      return task;
    }));
  };

  // Handle update task status (API call)
  const handleUpdateTaskStatus = async (taskId: number, newStatus: 'pending' | 'in_progress' | 'done') => {
    const task = rosterTasks.find(t => t.id === taskId);
    if (!task || !task.data) return;

    const originalTaskData = task.data;

    try {
      // Optimistic update
      setTaskStatusUpdates(prev => new Set(prev).add(taskId));
      updateTaskStatusLocally(taskId, newStatus);

      // Get original task ID from data (it's API task ID, not computed notification ID)
      const apiTaskId = (task.data as any).id;
      await rosterService.updateRosterTask(apiTaskId, { status: newStatus });

      toast.success(`Task status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating task status:', error);
      // Revert on error
      updateTaskStatusLocally(taskId, (originalTaskData as any).status || 'pending');
      toast.error(error.response?.data?.message || 'Failed to update task status');
    } finally {
      setTaskStatusUpdates(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleCreateRosterTask = async () => {
    if (!canCreateRosterTask) {
      toast.error('Hanya Admin, General Manager, atau Manager Teknik yang dapat menambahkan tugas roster');
      return;
    }

    const { title, description, date, shift_key, role, priority, assigned_to } = rosterTaskForm;
    if (!title.trim() || !date.trim()) {
      toast.error('Judul dan tanggal wajib diisi');
      return;
    }

    if (rosterTaskSendMode === 'schedule' && !rosterTaskScheduledDateTime) {
      toast.error('Pilih tanggal dan waktu untuk schedule roster task');
      return;
    }

    const rosterTaskData = {
      title,
      description,
      date,
      shift_key: normalizeShiftKeyForApi(shift_key),
      role,
      priority,
      assigned_to: selectedRosterUserIds.length > 0
        ? selectedRosterUserIds
        : (Array.isArray(assigned_to) ? assigned_to.map((v) => Number(v)).filter((v) => !Number.isNaN(v)) : []),
    };

    if (rosterTaskSendMode === 'draft') {
      setRosterTaskDrafts(prev => [
        ...prev,
        {
          ...rosterTaskData,
          created_at: new Date().toISOString(),
          status: 'draft',
        },
      ]);
      toast.success('Roster task disimpan sebagai draft');
      setIsRosterTaskModalOpen(false);
      setRosterTaskForm({
        title: '',
        description: '',
        date: '',
        shift_key: '07-13',
        role: 'CNS',
        priority: 'medium',
        assigned_to: [],
      });
      setSelectedRosterUserIds([]);
      setRosterTaskSendMode('now');
      setRosterTaskScheduledDateTime('');
      return;
    }

    if (rosterTaskSendMode === 'schedule') {
      setRosterTaskScheduled(prev => [
        ...prev,
        {
          ...rosterTaskData,
          scheduled_at: rosterTaskScheduledDateTime,
          created_at: new Date().toISOString(),
          status: 'scheduled',
        },
      ]);
      toast.success('Roster task dijadwalkan');
      setIsRosterTaskModalOpen(false);
      setRosterTaskForm({
        title: '',
        description: '',
        date: '',
        shift_key: '07-13',
        role: 'CNS',
        priority: 'medium',
        assigned_to: [],
      });
      setSelectedRosterUserIds([]);
      setRosterTaskSendMode('now');
      setRosterTaskScheduledDateTime('');
      return;
    }

    setIsRosterTaskSaving(true);

    try {
      await rosterService.createRosterTask(rosterTaskData);

      setSelectedRosterUserIds([]);
      toast.success('Roster task berhasil dibuat');
      setIsRosterTaskModalOpen(false);
      setRosterTaskForm({
        title: '',
        description: '',
        date: '',
        shift_key: '07-13',
        role: 'CNS',
        priority: 'medium',
        assigned_to: [],
      });
      setSelectedRosterUserIds([]);
      setActiveDate(date);
      setActiveShift(shift_key);
      setRosterTaskSendMode('now');
      setRosterTaskScheduledDateTime('');
      await loadRosterTasks();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Gagal membuat roster task';
      const details = error.response?.data?.errors
        ? ' (' + JSON.stringify(error.response?.data?.errors) + ')'
        : '';
      console.error('createRosterTask API error:', error.response?.data || error);
      toast.error(`${message}${details}`);
    } finally {
      setIsRosterTaskSaving(false);
    }
  };

  const loadRosterTasks = async () => {
    try {
      const response = await rosterService.getRosterTasks();
      const apiTasks: any[] = Array.isArray(response?.data) ? response.data : [];

      const localTasks: any[] = Array.isArray(JSON.parse(localStorage.getItem('rosterTasks') || '[]'))
        ? JSON.parse(localStorage.getItem('rosterTasks') || '[]')
        : [];

      const allTasks = [...apiTasks, ...localTasks];

      const taskNotifications = allTasks.map((task: any, idx: number) => ({
        id: 2000000 + Number(task.id || idx),
        user_id: user?.id || 0,
        sender_id: undefined,
        type: 'roster_task' as any,
        title: task.title || 'Untitled',
        message: `Priority: ${task.priority || 'unknown'} | ${task.description || 'No description'}`,
        category: 'roster' as NotificationCategory,
        data: task,
        is_read: false,
        is_starred: false,
        created_at: task.created_at || new Date().toISOString(),
        updated_at: task.updated_at || new Date().toISOString(),
      }));

      setRosterTasks(taskNotifications);
    } catch (error: any) {
      console.error('Error loading roster tasks from API, trying localStorage:', error);

      const localTasks: any[] = Array.isArray(JSON.parse(localStorage.getItem('rosterTasks') || '[]'))
        ? JSON.parse(localStorage.getItem('rosterTasks') || '[]')
        : [];

      const taskNotifications = localTasks.map((task: any, idx: number) => ({
        id: 2000000 + Number(task.id || idx),
        user_id: user?.id || 0,
        sender_id: undefined,
        type: 'roster_task' as any,
        title: task.title || 'Untitled',
        message: `Priority: ${task.priority || 'unknown'} | ${task.description || 'No description'}`,
        category: 'roster' as NotificationCategory,
        data: task,
        is_read: false,
        is_starred: false,
        created_at: task.created_at || new Date().toISOString(),
        updated_at: task.updated_at || new Date().toISOString(),
      }));

      setRosterTasks(taskNotifications);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadRosterTasks();
    }
  }, [user]);

  // Ref for user dropdown to detect click outside
  const userDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen]);
  
  // Get notifications for current category from cache
  // For 'all' category, combine all unique notifications from inbox + sent (starred and trash overlap)
  const notifications = useMemo(() => {
    if (isRosterCategory) {
      // Filter by active shift and date
      const filteredTasks = filterRosterTasksByShiftAndDate(activeShift, activeDate);
      return filteredTasks
        .slice()
        .sort((a, b) => {
          const dateA = new Date((a.data as any)?.date || a.created_at).getTime();
          const dateB = new Date((b.data as any)?.date || b.created_at).getTime();
          if (dateA !== dateB) return dateA - dateB;

          const shiftA = String((a.data as any)?.shift_key || '').localeCompare(String((b.data as any)?.shift_key || ''));
          if (shiftA !== 0) return shiftA;

          return String(a.title || '').localeCompare(String(b.title || ''));
        });
    }

    const inboxNotifications = notificationsByCategory.inbox || [];
    const sentNotifications = notificationsByCategory.sent || [];
    
    if (activeCategory === 'all') {
      const allNotificationsMap = new Map<number, Notification>();
      inboxNotifications.forEach(n => allNotificationsMap.set(n.id, n));
      sentNotifications.forEach(n => allNotificationsMap.set(n.id, n));
      const zippedNotifications = Array.from(allNotificationsMap.values());
      return [...rosterTasks, ...zippedNotifications]
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (activeCategory === 'inbox') {
      return inboxNotifications
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (activeCategory === 'drafts') {
      return drafts
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (activeCategory === 'scheduled') {
      return scheduledNotifications
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return (notificationsByCategory[activeCategory] || [])
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [activeCategory, notificationsByCategory, rosterTasks, activeShift, activeDate, user]);
  
  const stats = {
    ...notificationStats,
    roster: rosterTasks.length,
  };
  const isLoading = loadingStates.notifications;
  const canCreateRosterTask = isAdmin || isManager;

  const normalizeShiftKeyForApi = (shiftKey: string): 'pagi' | 'siang' | 'malam' => {
    if (!shiftKey) return 'pagi';
    const low = shiftKey.toLowerCase();
    if (low === '07-13' || low === 'pagi') return 'pagi';
    if (low === '13-19' || low === 'siang') return 'siang';
    if (low === '19-07' || low === 'malam') return 'malam';
    return 'pagi';
  };

  const parseNotificationData = (notification: Notification): Record<string, any> | null => {
    if (!notification.data) return null;

    if (typeof notification.data === 'object') {
      return notification.data as Record<string, any>;
    }

    if (typeof notification.data === 'string') {
      try {
        return JSON.parse(notification.data) as Record<string, any>;
      } catch {
        return null;
      }
    }

    return null;
  };

  const renderAssignedUsers = (task: any): React.ReactNode => {
    if (!task) {
      return <span className="text-gray-500">-</span>;
    }

    let data = task;
    if (typeof task === 'string') {
      try {
        data = JSON.parse(task);
      } catch {
        data = task;
      }
    }

    const values: any[] = Array.isArray(data.assigned_to)
      ? data.assigned_to
      : Array.isArray(data.recipients)
      ? data.recipients
      : Array.isArray(data.user_ids)
      ? data.user_ids
      : Array.isArray(data.recipient_ids)
      ? data.recipient_ids
      : [];

    if (values.length === 0) {
      return <span className="text-gray-500">-</span>;
    }

    const assigned = values.map((value) => {
      if (typeof value === 'object' && value !== null) {
        const idValue = typeof value.id !== 'undefined' ? Number(value.id) : undefined;
        const found = typeof idValue === 'number'
          ? users?.find((user: User) => user.id === idValue)
          : undefined;

        return {
          id: idValue,
          name: found?.name || value.name || value.email || String(value.id || value) || 'Unknown',
          role: found?.role || value.role || 'Unknown',
        };
      }

      const id = Number(value);
      const found = Number.isNaN(id)
        ? undefined
        : users?.find((user: User) => user.id === id);

      return {
        id: Number.isNaN(id) ? undefined : id,
        name: found?.name || (typeof value === 'string' ? value : `#${value}`),
        role: found?.role || 'Unknown',
      };
    });

    return (
      <div className="flex flex-wrap gap-2">
        {assigned.map((item) => (
          <span key={`${item.id ?? item.name}-${item.role}`} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700">
            <span className="font-semibold">{item.name}</span>
            <span className="text-[11px] text-gray-500">{item.role}</span>
          </span>
        ))}
      </div>
    );
  };

  const parseDateLabelToISO = (value: string): string | null => {
    const cleanValue = value.trim().replace(/\s+/g, ' ');
    const match = cleanValue.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);

    if (!match) return null;

    const day = match[1].padStart(2, '0');
    const monthRaw = match[2].toLowerCase();
    const year = match[3];

    const monthMap: Record<string, string> = {
      jan: '01',
      january: '01',
      feb: '02',
      february: '02',
      mar: '03',
      march: '03',
      apr: '04',
      april: '04',
      mei: '05',
      may: '05',
      jun: '06',
      june: '06',
      jul: '07',
      july: '07',
      agu: '08',
      agt: '08',
      aug: '08',
      august: '08',
      sep: '09',
      sept: '09',
      september: '09',
      okt: '10',
      oct: '10',
      october: '10',
      nov: '11',
      november: '11',
      des: '12',
      dec: '12',
      december: '12',
    };

    const month = monthMap[monthRaw];
    if (!month) return null;

    return `${year}-${month}-${day}`;
  };

  const parseLeaveMessage = (message: string): {
    employeeName: string;
    requestTypeName: string;
    startDate: string;
    endDate: string;
  } | null => {
    const pattern = /^(.+?)\s+mengajukan permohonan\s+(.+?)\s+\((.+?)\s+-\s+(.+?)\)$/i;
    const match = message.trim().match(pattern);

    if (!match) return null;

    const startDate = parseDateLabelToISO(match[3]);
    const endDate = parseDateLabelToISO(match[4]);

    if (!startDate || !endDate) return null;

    return {
      employeeName: match[1].trim(),
      requestTypeName: match[2].trim(),
      startDate,
      endDate,
    };
  };

  const isLeaveRequestNotification = (notification: Notification) => {
    const title = notification.title.toLowerCase();
    const message = notification.message.toLowerCase();

    if (notification.category === 'leave_request') return true;
    if (title.includes('permohonan cuti')) return true;

    return message.includes('mengajukan permohonan') && message.includes('cuti');
  };

  const getLeaveRequestIdFromNotification = (notification: Notification): number | null => {
    const data = parseNotificationData(notification);

    const idFromData = data?.leave_request_id ?? data?.leaveRequestId;
    if (typeof idFromData === 'number') return idFromData;
    if (typeof idFromData === 'string' && /^\d+$/.test(idFromData)) return Number(idFromData);

    const idFromTitle = notification.title.match(/(?:id|ref|#)\s*[:\-]?\s*(\d+)/i);
    if (idFromTitle) return Number(idFromTitle[1]);

    const idFromMessage = notification.message.match(/(?:id|ref|#)\s*[:\-]?\s*(\d+)/i);
    if (idFromMessage) return Number(idFromMessage[1]);

    return null;
  };

  const findLeaveRequestByMessage = async (notification: Notification): Promise<LeaveRequest | null> => {
    const parsedData = parseNotificationData(notification);
    const parsedMessage = parseLeaveMessage(notification.message);

    const pickClosestByCreatedAt = (candidates: LeaveRequest[]): LeaveRequest | null => {
      if (candidates.length === 0) return null;

      const notificationTime = new Date(notification.created_at).getTime();
      if (Number.isNaN(notificationTime)) {
        return candidates[0] ?? null;
      }

      return [...candidates].sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        const aDiff = Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : Math.abs(aTime - notificationTime);
        const bDiff = Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : Math.abs(bTime - notificationTime);
        return aDiff - bDiff;
      })[0] ?? null;
    };

    if (!parsedMessage && !parsedData) return null;

    const response = await leaveRequestService.getLeaveRequests({
      per_page: 200,
      page: 1,
    });

    const leaveRequests = response.data.data || [];

    const normalize = (value: string) => value.trim().toLowerCase();

    const dataEmployeeName = typeof parsedData?.employee_name === 'string'
      ? normalize(parsedData.employee_name)
      : null;
    const dataRequestType = typeof parsedData?.request_type === 'string'
      ? parsedData.request_type
      : null;
    const dataStartDate = typeof parsedData?.start_date === 'string'
      ? parsedData.start_date.slice(0, 10)
      : null;
    const dataEndDate = typeof parsedData?.end_date === 'string'
      ? parsedData.end_date.slice(0, 10)
      : null;

    const dataDrivenMatches = leaveRequests.filter((request) => {
      const employeeName = normalize(request.employee?.user?.name || '');
      const requestType = request.request_type;
      const startDate = request.start_date?.slice(0, 10);
      const endDate = request.end_date?.slice(0, 10);

      if (dataEmployeeName && employeeName !== dataEmployeeName) return false;
      if (dataRequestType && requestType !== dataRequestType) return false;
      if (dataStartDate && startDate !== dataStartDate) return false;
      if (dataEndDate && endDate !== dataEndDate) return false;

      return Boolean(dataEmployeeName || dataRequestType || dataStartDate || dataEndDate);
    });

    if (dataDrivenMatches.length === 1) {
      return dataDrivenMatches[0] ?? null;
    }

    if (dataDrivenMatches.length > 1) {
      return pickClosestByCreatedAt(dataDrivenMatches);
    }

    if (!parsedMessage) {
      return null;
    }

    const exactMatches = leaveRequests.filter((request) => {
      const employeeName = normalize(request.employee?.user?.name || '');
      const requestTypeName = normalize(request.request_type_name || '');
      const startDate = request.start_date?.slice(0, 10);
      const endDate = request.end_date?.slice(0, 10);

      return (
        employeeName === normalize(parsedMessage.employeeName) &&
        requestTypeName === normalize(parsedMessage.requestTypeName) &&
        startDate === parsedMessage.startDate &&
        endDate === parsedMessage.endDate
      );
    });

    if (exactMatches.length === 1) {
      return exactMatches[0] ?? null;
    }

    if (exactMatches.length > 1) {
      return pickClosestByCreatedAt(exactMatches);
    }

    return null;
  };

  const openLeaveApprovalFromNotification = async (notification: Notification) => {
    if (!isManager) {
      navigate('/leave-requests');
      return;
    }

    try {
      let leaveRequest: LeaveRequest | null = null;
      const leaveRequestId = getLeaveRequestIdFromNotification(notification);

      if (leaveRequestId) {
        const response = await leaveRequestService.getLeaveRequestById(leaveRequestId);
        leaveRequest = response.data;
      } else {
        leaveRequest = await findLeaveRequestByMessage(notification);
      }

      if (!leaveRequest) {
        toast.info('Detail permohonan cuti tidak ditemukan dari notifikasi ini. Silakan buka menu Leave Requests.');
        navigate('/leave-requests');
        return;
      }

      if (!notification.is_read) {
        handleMarkAsRead(notification);
      }

      setSelectedLeaveRequest(leaveRequest);
      setSelectedNotification(notification);
      setIsLeaveApprovalModalOpen(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membuka detail permohonan cuti');
    }
  };

  const handleLeaveApprovalSuccess = async () => {
    await refreshNotificationsByCategory();
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    const query = userSearchQuery.toLowerCase();
    return users.filter((user: User) => 
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  }, [users, userSearchQuery]);

  // Get selected users info
  const selectedUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user: User) => selectedUserIds.includes(user.id));
  }, [users, selectedUserIds]);

  // Refresh notifications for current category
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNotificationsByCategory();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCategoryChange = (category: NotificationCategory) => {
    setActiveCategory(category);
  };

  const handleToggleStar = async (notification: Notification) => {
    try {
      // Optimistic update
      toggleNotificationStar(notification.id);
      
      await notificationService.toggleStar(notification.id);
      toast.success(notification.is_starred ? 'Removed from starred' : 'Added to starred');
    } catch (error: any) {
      // Revert on error
      toggleNotificationStar(notification.id);
      toast.error(error.response?.data?.message || 'Failed to update');
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;
    
    // Always update read state locally first
    updateNotificationInCache(notification.id, { is_read: true, read_at: new Date().toISOString() });

    if (notification.type === 'roster_task' || notification.category === 'roster') {
      // Roster tasks are generated locally and do not exist in backend notifications table.
      return;
    }

    try {
      await notificationService.markAsRead(notification.id);
    } catch (error: any) {
      // Revert on error for backend-supported notifications
      updateNotificationInCache(notification.id, { is_read: false, read_at: null });
      toast.error(error.response?.data?.message || 'Failed to mark as read');
    }
  };

  const handleDelete = async (notification: Notification) => {
    // Handle drafts and scheduled notifications locally
    if (activeCategory === 'drafts') {
      setDrafts(prev => prev.filter(d => d.id !== notification.id));
      toast.success('Draft deleted');
      return;
    }

    if (activeCategory === 'scheduled') {
      setScheduledNotifications(prev => prev.filter(s => s.id !== notification.id));
      toast.success('Scheduled notification cancelled');
      return;
    }

    try {
      // Determine actual category for the cache update
      // 'all' is just a UI display category, actual data is in inbox or sent
      let fromCategory: 'inbox' | 'sent' | 'starred' | 'trash' | 'roster' | 'drafts' | 'scheduled';
      if (activeCategory === 'all') {
        // Check if notification is in inbox or sent based on type
        fromCategory = notification.type === 'sent' ? 'sent' : 'inbox';
      } else {
        // activeCategory is guaranteed to be a valid NotificationCategory excluding 'all'
        fromCategory = activeCategory as Exclude<NotificationCategory, 'all'>;
      }
      
      // Optimistic update - move to trash locally
      moveNotificationToTrash(notification.id, fromCategory);
      
      await notificationService.deleteNotification(notification.id);
      toast.success('Moved to trash');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
      // Refresh to restore state on error
      await refreshNotificationsByCategory();
    }
  };

  // Shift Request Quick Actions
  const handleApproveShiftRequest = async (notification: Notification) => {
    if (!notification.reference_id) return;
    
    setProcessingShiftRequestIds(prev => new Set(prev).add(notification.id));
    try {
      // Always check latest status before taking action
      const latest = await shiftRequestService.getShiftRequest(notification.reference_id);
      const latestStatus = latest.data?.status;

      if (latestStatus !== 'pending') {
        setActionedNotificationIds(prev => new Set(prev).add(notification.id));
        toast.info(latestStatus === 'cancelled' ? 'Permintaan sudah dibatalkan dan tidak bisa di-approve' : 'Permintaan ini sudah tidak bisa diproses');
        await refreshNotificationsByCategory();
        return;
      }

      // Check notification title to determine which approval endpoint to call
      if (notification.title === 'Approval Diperlukan') {
        // Manager approval
        await shiftRequestService.approveAsManager(notification.reference_id);
        toast.success('Permintaan tukar shift diapprove oleh manager');
      } else {
        // Target approval (default for 'Permintaan Tukar Shift')
        await shiftRequestService.approveAsTarget(notification.reference_id);
        toast.success('Permintaan tukar shift disetujui');
      }
      // Mark as actioned so buttons won't show again
      setActionedNotificationIds(prev => new Set(prev).add(notification.id));
      // Mark notification as read and refresh
      if (!notification.is_read) {
        await handleMarkAsRead(notification);
      }
      await refreshNotificationsByCategory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menyetujui permintaan');
    } finally {
      setProcessingShiftRequestIds(prev => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const handleRejectShiftRequest = async (notification: Notification) => {
    if (!notification.reference_id) return;
    
    const reason = prompt('Alasan penolakan (opsional):');
    if (reason === null) return; // User cancelled
    
    setProcessingShiftRequestIds(prev => new Set(prev).add(notification.id));
    try {
      // Always check latest status before taking action
      const latest = await shiftRequestService.getShiftRequest(notification.reference_id);
      const latestStatus = latest.data?.status;

      if (latestStatus !== 'pending') {
        setActionedNotificationIds(prev => new Set(prev).add(notification.id));
        toast.info(latestStatus === 'cancelled' ? 'Permintaan sudah dibatalkan dan tidak bisa ditolak' : 'Permintaan ini sudah tidak bisa diproses');
        await refreshNotificationsByCategory();
        return;
      }

      await shiftRequestService.rejectRequest(notification.reference_id, { reason: reason || undefined });
      toast.success('Permintaan tukar shift ditolak');
      // Mark as actioned so buttons won't show again
      setActionedNotificationIds(prev => new Set(prev).add(notification.id));
      // Mark notification as read and refresh
      if (!notification.is_read) {
        await handleMarkAsRead(notification);
      }
      await refreshNotificationsByCategory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menolak permintaan');
    } finally {
      setProcessingShiftRequestIds(prev => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const handleViewDetail = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      handleMarkAsRead(notification);
    }

    // Handle leave request notifications directly from inbox for managers
    if (isLeaveRequestNotification(notification) && isManager) {
      openLeaveApprovalFromNotification(notification);
      return;
    }

    // Default: show detail modal
    setSelectedNotification(notification);
    setIsDetailModalOpen(true);
  };

  const handleToggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleRemoveSelectedUser = (userId: number) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
  };

  // Quick select functions
  const handleSelectAll = () => {
    if (!users) return;
    setSelectedUserIds(users.map((u: User) => u.id));
  };

  const handleSelectByRole = (role: string) => {
    if (!users) return;
    const roleUsers = users.filter((u: User) => u.role.toLowerCase() === role.toLowerCase());
    setSelectedUserIds(roleUsers.map((u: User) => u.id));
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleSendNotification = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (!composeForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!composeForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      await notificationService.sendNotification({
        user_ids: selectedUserIds,
        title: composeForm.title,
        message: composeForm.message,
        send_email: composeForm.send_email,
      });
      
      toast.success(`Notification sent to ${selectedUserIds.length} user(s)`);
      
      // Reset form
      setComposeForm({ title: '', message: '', send_email: false });
      setSelectedUserIds([]);
      setUserSearchQuery('');
      setIsComposeModalOpen(false);
      
      // Note: Sent notifications will appear after manual refresh
      // or we can do a background refresh without blocking UI
      refreshNotificationsByCategory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!composeForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!composeForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      // Create draft notification object
      const draftNotification: Notification = {
        id: Date.now(), // Temporary ID for local storage
        user_id: user?.id || 0,
        sender_id: user?.id,
        type: 'inbox',
        title: composeForm.title,
        message: composeForm.message,
        category: 'drafts',
        data: {
          recipients: selectedUserIds,
          send_email: composeForm.send_email,
        },
        is_read: true,
        is_starred: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
        } : undefined,
      };

      // Add to drafts (in a real app, this would be saved to backend)
      setDrafts(prev => [draftNotification, ...prev]);
      
      toast.success('Draft saved successfully');
      
      // Reset form
      setComposeForm({ title: '', message: '', send_email: false });
      setSelectedUserIds([]);
      setUserSearchQuery('');
      setSendMode('now');
      setIsComposeModalOpen(false);
    } catch (error: any) {
      toast.error('Failed to save draft');
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleNotification = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (!composeForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!composeForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (!scheduledDateTime) {
      toast.error('Please select date and time for scheduling');
      return;
    }

    const scheduledDate = new Date(scheduledDateTime);
    if (scheduledDate <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    setIsSending(true);
    try {
      // Create scheduled notification object
      const scheduledNotification: Notification = {
        id: Date.now(), // Temporary ID for local storage
        user_id: user?.id || 0,
        sender_id: user?.id,
        type: 'inbox',
        title: composeForm.title,
        message: composeForm.message,
        category: 'scheduled',
        data: {
          recipients: selectedUserIds,
          send_email: composeForm.send_email,
          scheduled_at: scheduledDateTime,
        },
        is_read: true,
        is_starred: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
        } : undefined,
      };

      // Add to scheduled notifications (in a real app, this would be saved to backend)
      setScheduledNotifications(prev => [scheduledNotification, ...prev]);
      
      toast.success(`Notification scheduled for ${scheduledDate.toLocaleString('id-ID', { 
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'short'
      })}`);
      
      // Reset form
      setComposeForm({ title: '', message: '', send_email: false });
      setSelectedUserIds([]);
      setUserSearchQuery('');
      setSendMode('now');
      setScheduledDateTime('');
      setIsComposeModalOpen(false);
    } catch (error: any) {
      toast.error('Failed to schedule notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleEditDraft = (notification: Notification) => {
    // Load draft data into compose form
    setComposeForm({
      title: notification.title,
      message: notification.message,
      send_email: notification.data?.send_email || false,
    });
    setSelectedUserIds(notification.data?.recipients || []);
    setSendMode('draft');
    setIsComposeModalOpen(true);
    
    // Remove from drafts
    setDrafts(prev => prev.filter(d => d.id !== notification.id));
  };

  const handleSendDraft = async (notification: Notification) => {
    setIsSending(true);
    try {
      await notificationService.sendNotification({
        user_ids: notification.data?.recipients || [],
        title: notification.title,
        message: notification.message,
        send_email: notification.data?.send_email || false,
      });
      
      toast.success(`Notification sent to ${notification.data?.recipients?.length || 0} user(s)`);
      
      // Remove from drafts and add to sent
      setDrafts(prev => prev.filter(d => d.id !== notification.id));
      refreshNotificationsByCategory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send draft');
    } finally {
      setIsSending(false);
    }
  };

  const handleEditScheduled = (notification: Notification) => {
    // Load scheduled data into compose form
    setComposeForm({
      title: notification.title,
      message: notification.message,
      send_email: notification.data?.send_email || false,
    });
    setSelectedUserIds(notification.data?.recipients || []);
    setSendMode('schedule');
    setScheduledDateTime(notification.data?.scheduled_at || '');
    setIsComposeModalOpen(true);
    
    // Remove from scheduled
    setScheduledNotifications(prev => prev.filter(s => s.id !== notification.id));
  };

  const handleCancelScheduled = (notification: Notification) => {
    // Remove from scheduled notifications
    setScheduledNotifications(prev => prev.filter(s => s.id !== notification.id));
    toast.success('Scheduled notification cancelled');
  };

  const handleRestore = async (notification: Notification) => {
    try {
      await notificationService.restoreNotification(notification.id);
      restoreNotificationFromTrash(notification);
      toast.success('Notification restored');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore');
    }
  };

  const handlePermanentDelete = async (notification: Notification) => {
    try {
      await notificationService.permanentDelete(notification.id);
      removeNotificationFromCategory(notification.id, 'trash');
      toast.success('Notification permanently deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete permanently');
    }
  };

  const handleOpenCompose = () => {
    setComposeForm({ title: '', message: '', send_email: false });
    setSelectedUserIds([]);
    setUserSearchQuery('');
    setSendMode('now');
    setScheduledDateTime('');
    setIsComposeModalOpen(true);
  };

  const handleOpenRosterTaskModal = () => {
    setRosterTaskForm({
      title: '',
      description: '',
      date: '',
      shift_key: '07-13',
      role: 'CNS',
      priority: 'medium',
      assigned_to: [],
    });
    setSelectedRosterUserIds([]);
    setRosterTaskSendMode('now');
    setRosterTaskScheduledDateTime('');
    setIsRosterTaskModalOpen(true);
  };

  const allCategories = [
    { 
      key: 'all' as NotificationCategory,
      label: 'All', 
      icon: Archive, 
      count: stats.inbox + stats.sent + stats.roster, // Inbox + Sent + Roster (non-duplicated)
      bgGradient: 'from-gray-50 to-gray-100/50',
      borderColor: 'border-gray-300',
      iconBg: 'bg-gray-500',
      iconBorder: 'border-gray-600',
      textColor: 'text-gray-700',
      countColor: 'text-gray-900',
    },
  ];

  const categories = [
    { 
      key: 'inbox' as NotificationCategory, 
      label: 'Inbox', 
      icon: Inbox, 
      count: stats.inbox,
      bgGradient: 'from-green-50 to-green-100/50',
      borderColor: 'border-green-300',
      iconBg: 'bg-green-500',
      iconBorder: 'border-green-600',
      textColor: 'text-green-700',
      countColor: 'text-green-900',
    },
    { 
      key: 'starred' as NotificationCategory, 
      label: 'Starred', 
      icon: Star, 
      count: stats.starred,
      bgGradient: 'from-amber-50 to-amber-100/50',
      borderColor: 'border-amber-300',
      iconBg: 'bg-amber-500',
      iconBorder: 'border-amber-600',
      textColor: 'text-amber-700',
      countColor: 'text-amber-900',
    },
    { 
      key: 'sent' as NotificationCategory, 
      label: 'Sent', 
      icon: Send, 
      count: stats.sent,
      bgGradient: 'from-blue-50 to-blue-100/50',
      borderColor: 'border-blue-300',
      iconBg: 'bg-blue-500',
      iconBorder: 'border-blue-600',
      textColor: 'text-blue-700',
      countColor: 'text-blue-900',
    },
    { 
      key: 'roster' as NotificationCategory, 
      label: 'Roster', 
      icon: Clock, 
      count: stats.roster,
      bgGradient: 'from-purple-50 to-purple-100/50',
      borderColor: 'border-purple-300',
      iconBg: 'bg-purple-500',
      iconBorder: 'border-purple-600',
      textColor: 'text-purple-700',
      countColor: 'text-purple-900',
    },
    { 
      key: 'drafts' as NotificationCategory, 
      label: 'Drafts', 
      icon: FileText, 
      count: drafts.length,
      bgGradient: 'from-gray-50 to-gray-100/50',
      borderColor: 'border-gray-300',
      iconBg: 'bg-gray-500',
      iconBorder: 'border-gray-600',
      textColor: 'text-gray-700',
      countColor: 'text-gray-900',
    },
    { 
      key: 'scheduled' as NotificationCategory, 
      label: 'Scheduled', 
      icon: Calendar, 
      count: scheduledNotifications.length,
      bgGradient: 'from-indigo-50 to-indigo-100/50',
      borderColor: 'border-indigo-300',
      iconBg: 'bg-indigo-500',
      iconBorder: 'border-indigo-600',
      textColor: 'text-indigo-700',
      countColor: 'text-indigo-900',
    },
    { 
      key: 'trash' as NotificationCategory, 
      label: 'Trash', 
      icon: Trash2, 
      count: stats.trash,
      bgGradient: 'from-red-50 to-red-100/50',
      borderColor: 'border-red-300',
      iconBg: 'bg-red-500',
      iconBorder: 'border-red-600',
      textColor: 'text-red-700',
      countColor: 'text-red-900',
    },
  ];

  return (
    <PageHeader
      title="Notifications"
      subtitle="Manage notifications"
      breadcrumbs={[
        { label: 'Notifications', href: '/notifications' }
      ]}
    >
      {/* Category Boxes */}
      {/* Desktop View - Responsive Grid */}
      <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
        {[...allCategories, ...categories].map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.key;
          
          return (
            <button
              key={category.key}
              onClick={() => handleCategoryChange(category.key as NotificationCategory)}
              className={`bg-white rounded-2xl border-2 ${category.borderColor} p-4 transition-all duration-200 cursor-pointer h-full min-w-0 flex items-center gap-4 text-left shadow-sm ${
                isActive 
                  ? `shadow-xl scale-105`
                  : `hover:shadow-md hover:scale-[1.02] opacity-95 hover:opacity-100`
              }`}
            >
              <div className={`flex-shrink-0 w-14 h-14 ${category.iconBg} rounded-2xl flex items-center justify-center border-2 ${category.iconBorder}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${category.textColor} truncate`}>{category.label}</p>
                <p className={`text-3xl font-bold ${category.countColor} leading-none mt-1`}>{category.count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile View - Horizontal Pills */}
      <div className="md:hidden mb-0 relative">
        <div className="flex gap-3 pb-2 overflow-x-auto px-1">
          {[...allCategories, ...categories].map((category) => {
            const isActive = activeCategory === category.key;
            
            return (
              <button
                key={category.key}
                onClick={() => handleCategoryChange(category.key as NotificationCategory)}
                className={`flex items-center gap-3 min-w-[10rem] rounded-2xl border-2 px-4 py-3 transition-all duration-200 ${
                  isActive 
                    ? `bg-white ${category.borderColor} shadow-md`
                    : `bg-white ${category.borderColor} opacity-80 hover:opacity-100`
                }`}
              >
                <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${category.iconBg} border-2 ${category.iconBorder}`}>
                  <category.icon className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${category.textColor} truncate`}>{category.label}</p>
                  <p className={`text-base font-bold ${category.countColor} mt-1`}>{category.count}</p>
                </div>
              </button>
            );
          })}
        </div>
        {/* Scroll indicator */}
        <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none flex items-center justify-end pr-2">
          <svg className="h-5 w-5 text-gray-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {(() => {
              const allItems = [...allCategories, ...categories];
              const activeItem = allItems.find(c => c.key === activeCategory);
              if (!activeItem) return null;
              const ActiveIcon = activeItem.icon;
              return (
                <div className={`p-2 rounded-lg ${activeItem.iconBg}`}>
                  <ActiveIcon className={`h-5 w-5 text-white`} />
                </div>
              );
            })()}
            <h2 className="text-xl font-semibold text-gray-900">
              {[...allCategories, ...categories].find(c => c.key === activeCategory)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="text-xs px-2 py-1.5 sm:text-base sm:px-4 sm:py-2"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
              <span className="ml-1 sm:ml-2">Refresh</span>
            </Button>
            {canCreateRosterTask && isRosterCategory && (
              <Button
                variant="primary"
                onClick={handleOpenRosterTaskModal}
                className="bg-[#222E6A] hover:bg-[#1a2452] text-xs px-2 py-1.5 sm:text-base sm:px-4 sm:py-2"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="ml-1 sm:ml-2">Add Roster Task</span>
              </Button>
            )}
            {!isRosterCategory && activeCategory !== 'trash' && (
              <Button
                variant="primary"
                onClick={handleOpenCompose}
                className="bg-[#222E6A] hover:bg-[#1a2452] text-xs px-2 py-1.5 sm:text-base sm:px-4 sm:py-2"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="ml-1 sm:ml-2">Compose</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Shift Tabs - Only show for roster category */}
        {isRosterCategory && (
          <div>
            {/* Shift Selection */}
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex gap-2 overflow-x-auto">
                {getAllShiftsSorted().map((shift) => {
                  const count = filterRosterTasksByShift(shift.key).length;
                  return (
                    <button
                      key={shift.key}
                      onClick={() => handleShiftChange(shift.key)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                        activeShift === shift.key
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {shift.label} {shift.startTime}-{shift.endTime}
                      {count > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                          activeShift === shift.key
                            ? 'bg-purple-400'
                            : 'bg-gray-300'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Filter - Show when shift selected */}
            {activeShift && (
              <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">Filter</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => handleYearChange(e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-500"
                    >
                      <option value="all">All Years</option>
                      {availableYears.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <select
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-500"
                    >
                      <option value="all">All Months</option>
                      {availableMonths.map((monthIndex) => (
                        <option key={monthIndex} value={String(monthIndex)}>{MONTH_LABELS[monthIndex]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {availableDates.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    <button
                      onClick={() => setActiveDate(null)}
                      className={`px-3 py-1.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                        activeDate === null
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      All Dates ({availableDates.length})
                    </button>
                    {pagedDates.map((date) => {
                      const taskCount = filterRosterTasksByShiftAndDate(activeShift, date).length;
                      return (
                        <button
                          key={date}
                          onClick={() => setActiveDate(date)}
                          className={`px-3 py-1.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                            activeDate === date
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {format(new Date(date), 'MMM dd')} ({taskCount})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No notifications in {activeCategory}</p>
          </div>
        ) : isRosterCategory ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border-collapse border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border border-gray-200">Date</th>
                  <th className="px-3 py-2 border border-gray-200">Shift</th>
                  <th className="px-3 py-2 border border-gray-200">Title</th>
                  <th className="px-3 py-2 border border-gray-200">Description</th>
                  <th className="px-3 py-2 border border-gray-200">Assigned</th>
                  <th className="px-3 py-2 border border-gray-200">Priority</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => {
                  const task = notification.data as any;

                  return (
                    <tr
                      key={notification.id}
                      className={`${!notification.is_read ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50 cursor-pointer`}
                      onClick={() => handleViewDetail(notification)}
                    >
                      <td className="px-3 py-2 border border-gray-200">{task?.date || '-'}</td>
                      <td className="px-3 py-2 border border-gray-200">{task?.shift_key || '-'}</td>
                      <td className="px-3 py-2 border border-gray-200 font-semibold text-gray-800">{notification.title}</td>
                      <td className="px-3 py-2 border border-gray-200 text-sm text-gray-600">{task?.description || '-'}</td>
                      <td className="px-3 py-2 border border-gray-200">{renderAssignedUsers(task)}</td>
                      <td className="px-3 py-2 border border-gray-200 uppercase">{task?.priority || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Pagination - Show below roster table */}
            {activeShift && availableDates.length > datesPerPage && (
              <div className="flex items-center justify-end gap-3 mt-4 px-3 py-3 border-t border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => handleDatePage(-1)}
                  disabled={datePage === 0}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  Page {Math.min(datePage + 1, Math.max(1, Math.ceil(availableDates.length / datesPerPage)))} of {Math.max(1, Math.ceil(availableDates.length / datesPerPage))}
                </span>
                <button
                  type="button"
                  onClick={() => handleDatePage(1)}
                  disabled={datePage >= Math.ceil(availableDates.length / datesPerPage) - 1}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 sm:p-4 hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {activeCategory !== 'trash' && (
                    <button
                      onClick={() => handleToggleStar(notification)}
                      className="flex-shrink-0 mt-0.5 sm:mt-1"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          notification.is_starred
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300 hover:text-yellow-500'
                        }`}
                      />
                    </button>
                  )}

                  <div className="flex-1 min-w-0">
                    <div
                      className="cursor-pointer"
                      onClick={() => handleViewDetail(notification)}
                    >
                      <div className="flex items-start gap-2 mb-1.5">
                        {!notification.is_read ? (
                          <Mail className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <MailOpen className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        )}
                        <h3 className={`min-w-0 text-sm sm:text-base leading-snug line-clamp-2 font-semibold ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {notification.title}
                        </h3>
                        {/* Status Badge for Roster Tasks */}
                        {isRosterCategory && notification.data && (() => {
                          const status = (notification.data as any).status || 'pending';
                          const statusColors = {
                            'pending': 'bg-yellow-100 text-yellow-800',
                            'in_progress': 'bg-blue-100 text-blue-800',
                            'done': 'bg-green-100 text-green-800',
                          };
                          const color = statusColors[status as keyof typeof statusColors] || statusColors.pending;
                          return (
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${color}`}>
                              {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2.5">
                        {notification.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                        {notification.sender && (
                          <span className="flex items-center gap-1 truncate">
                            From: {notification.sender.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {activeCategory === 'scheduled' && notification.data?.scheduled_at
                            ? `Scheduled: ${format(new Date(notification.data.scheduled_at), 'MMM dd, yyyy HH:mm')} WIB`
                            : activeCategory === 'drafts'
                            ? `Draft: ${format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}`
                            : format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')
                          }
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    {/* Quick Actions for Roster Tasks */}
                    {isRosterCategory && notification.data && (() => {
                      const taskStatus = (notification.data as any).status || 'pending';
                      const isUpdating = taskStatusUpdates.has(notification.id);
                      
                      return (
                        <>
                          {taskStatus !== 'done' && (
                            <>
                              {taskStatus === 'pending' && (
                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTaskStatus(notification.id, 'in_progress');
                                  }}
                                  disabled={isUpdating}
                                  className="text-sm text-blue-600 hover:bg-blue-50 border-blue-300"
                                  title="Start Task"
                                >
                                  ▶ Start
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateTaskStatus(notification.id, 'done');
                                }}
                                disabled={isUpdating}
                                className="text-sm text-green-600 hover:bg-green-50 border-green-300"
                                title="Mark as Done"
                              >
                                <Check className="h-4 w-4" /> Done
                              </Button>
                            </>
                          )}
                          {taskStatus === 'done' && (
                            <span className="text-sm text-green-600 font-semibold">✓ Completed</span>
                          )}
                        </>
                      );
                    })()}

                    {/* Quick Actions for Shift Request Notifications - status-aware */}
                    {notification.category === 'shift_request' && notification.reference_id && activeCategory !== 'trash' && activeCategory !== 'sent' && (() => {
                      const shiftStatus = shiftRequestStatusById[notification.reference_id];
                      const isActionableTitle = notification.title === 'Permintaan Tukar Shift' || notification.title === 'Approval Diperlukan';
                      const canShowActions = isActionableTitle
                        && !actionedNotificationIds.has(notification.id)
                        && shiftStatus === 'pending';

                      if (canShowActions) {
                        return (
                          <>
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveShiftRequest(notification);
                              }}
                              disabled={processingShiftRequestIds.has(notification.id)}
                              className="text-sm text-green-600 hover:bg-green-50 border-green-300"
                              title="Setujui"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectShiftRequest(notification);
                              }}
                              disabled={processingShiftRequestIds.has(notification.id)}
                              className="text-sm text-red-600 hover:bg-red-50 border-red-300"
                              title="Tolak"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        );
                      }

                      const badgeClass = actionedNotificationIds.has(notification.id)
                        ? 'bg-blue-100 text-blue-700'
                        : shiftStatus === 'cancelled' || notification.title === 'Permintaan Dibatalkan'
                        ? 'bg-gray-100 text-gray-700'
                        : shiftStatus === 'completed' || notification.title === 'Tukar Shift Selesai'
                        ? 'bg-green-100 text-green-700'
                        : shiftStatus === 'rejected' || notification.title === 'Permintaan Ditolak' || notification.title === 'Tukar Shift Ditolak'
                        ? 'bg-red-100 text-red-700'
                        : shiftStatus === 'approved' || notification.title === 'Tukar Shift Disetujui'
                        ? 'bg-yellow-100 text-yellow-700'
                        : shiftStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700';

                      const badgeLabel = actionedNotificationIds.has(notification.id)
                        ? 'Sudah Diproses'
                        : shiftStatus === 'cancelled' || notification.title === 'Permintaan Dibatalkan'
                        ? 'Dibatalkan'
                        : shiftStatus === 'completed' || notification.title === 'Tukar Shift Selesai'
                        ? 'Selesai'
                        : shiftStatus === 'rejected' || notification.title === 'Permintaan Ditolak' || notification.title === 'Tukar Shift Ditolak'
                        ? 'Ditolak'
                        : shiftStatus === 'approved' || notification.title === 'Tukar Shift Disetujui'
                        ? 'Menunggu Manager'
                        : shiftStatus === 'pending'
                        ? 'Menunggu'
                        : 'Memuat Status';

                      return (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                      );
                    })()}
                    
                      {activeCategory === 'trash' ? (
                        <>
                          <Button
                            variant="outline"
                            effect3d={false}
                            onClick={() => handleRestore(notification)}
                            className="text-xs sm:text-sm"
                          >
                            Restore
                          </Button>
                          <Button
                            variant="outline"
                            effect3d={false}
                            onClick={() => handlePermanentDelete(notification)}
                            className="text-xs sm:text-sm text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Delete Forever
                          </Button>
                        </>
                      ) : activeCategory === 'drafts' ? (
                        <>
                          <Button
                            variant="outline"
                            effect3d={false}
                            onClick={() => handleEditDraft(notification)}
                            className="text-xs sm:text-sm"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="primary"
                            effect3d={false}
                            onClick={() => handleSendDraft(notification)}
                            className="text-xs sm:text-sm bg-[#222E6A] hover:bg-[#1a2452]"
                          >
                            Send Now
                          </Button>
                        </>
                      ) : activeCategory === 'scheduled' ? (
                        <>
                          <Button
                            variant="outline"
                            effect3d={false}
                            onClick={() => handleEditScheduled(notification)}
                            className="text-xs sm:text-sm"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            effect3d={false}
                            onClick={() => handleCancelScheduled(notification)}
                            className="text-xs sm:text-sm text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          {isManager && isLeaveRequestNotification(notification) && (
                            <Button
                              variant="success"
                              effect3d={false}
                              onClick={() => openLeaveApprovalFromNotification(notification)}
                              className="w-full sm:w-auto text-xs sm:text-sm px-3 py-2 whitespace-nowrap"
                            >
                              Proses Cuti
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            effect3d={false}
                            size="sm"
                            onClick={() => handleDelete(notification)}
                            className="h-10 w-10 p-0 border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Roster Task Modal */}
      <Modal
        isOpen={isRosterTaskModalOpen}
        onClose={() => setIsRosterTaskModalOpen(false)}
        title="Add Roster Task"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={rosterTaskForm.title}
              onChange={(e) => setRosterTaskForm(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={rosterTaskForm.description}
              onChange={(e) => setRosterTaskForm(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={rosterTaskForm.date}
                onChange={(e) => setRosterTaskForm(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Shift</label>
              <select
                value={rosterTaskForm.shift_key}
                onChange={(e) => setRosterTaskForm(prev => ({ ...prev, shift_key: e.target.value as ShiftKey }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="07-13">07-13</option>
                <option value="13-19">13-19</option>
                <option value="19-07">19-07</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={rosterTaskForm.role}
                onChange={(e) => setRosterTaskForm(prev => ({ ...prev, role: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="CNS">CNS</option>
                <option value="Support">Support</option>
                <option value="Manager Teknik">Manager Teknik</option>
                <option value="General Manager">General Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={rosterTaskForm.priority}
                onChange={(e) => setRosterTaskForm(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Send Options</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="roster_send_now"
                  name="roster_send_mode"
                  value="now"
                  checked={rosterTaskSendMode === 'now'}
                  onChange={() => setRosterTaskSendMode('now')}
                  className="h-4 w-4 text-[#222E6A] border-gray-300 focus:ring-[#222E6A]"
                />
                <label htmlFor="roster_send_now" className="text-sm text-gray-700">Send Now</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="roster_save_draft"
                  name="roster_send_mode"
                  value="draft"
                  checked={rosterTaskSendMode === 'draft'}
                  onChange={() => setRosterTaskSendMode('draft')}
                  className="h-4 w-4 text-[#222E6A] border-gray-300 focus:ring-[#222E6A]"
                />
                <label htmlFor="roster_save_draft" className="text-sm text-gray-700">Save as Draft</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="roster_schedule_send"
                  name="roster_send_mode"
                  value="schedule"
                  checked={rosterTaskSendMode === 'schedule'}
                  onChange={() => setRosterTaskSendMode('schedule')}
                  className="h-4 w-4 text-[#222E6A] border-gray-300 focus:ring-[#222E6A]"
                />
                <label htmlFor="roster_schedule_send" className="text-sm text-gray-700">Schedule Send</label>
              </div>
            </div>
          </div>

          {rosterTaskSendMode === 'schedule' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={rosterTaskScheduledDateTime.split('T')[0] || ''}
                  onChange={(e) => {
                    const time = rosterTaskScheduledDateTime.split('T')[1] || '00:00';
                    setRosterTaskScheduledDateTime(`${e.target.value}T${time}`);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Time (WIB) <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  value={rosterTaskScheduledDateTime.split('T')[1] || ''}
                  onChange={(e) => {
                    const date = rosterTaskScheduledDateTime.split('T')[0] || new Date().toISOString().split('T')[0];
                    setRosterTaskScheduledDateTime(`${date}T${e.target.value}`);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Assign to Users</label>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span>Role: <strong>{rosterTaskForm.role}</strong></span>
              <span>|</span>
              <span>{availableRosterUsers.length} users matching role</span>
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 p-2 rounded-md bg-white">
              {availableRosterUsers.length ? availableRosterUsers.map((u: User) => {
                const isSelected = selectedRosterUserIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedRosterUserIds(prev =>
                        prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                      );
                    }}
                    className={`text-left px-2 py-2 border rounded-md ${
                      isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{u.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-purple-600" />}
                    </div>
                    <p className="text-xs text-gray-500">{u.role}</p>
                  </button>
                );
              }) : <p className="text-sm text-gray-500">No users available for selected role</p>}
            </div>
            <p className="text-xs text-gray-500 mt-1">Kosongkan untuk umum/role-based assignment.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRosterTaskModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleCreateRosterTask} disabled={isRosterTaskSaving}>
              {isRosterTaskSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selectedNotification && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedNotification(null);
          }}
          title={selectedNotification.title}
          size="lg"
        >
          {(() => {
            const taskData = selectedNotification.data as any;
            const isRosterTaskDetail = selectedNotification.category === 'roster' || selectedNotification.type === 'roster_task';

            if (isRosterTaskDetail && taskData) {
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Title</p>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{selectedNotification.title}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Priority</p>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{String(taskData.priority || selectedNotification.message || '-').toUpperCase()}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Date</p>
                      <p className="mt-2 text-sm text-gray-900">{taskData.date || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Shift</p>
                      <p className="mt-2 text-sm text-gray-900">{taskData.shift_key || '-'}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Description</p>
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap break-words">{taskData.description || '-'}</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Assigned</p>
                    <div className="flex flex-wrap gap-2">{renderAssignedUsers(taskData)}</div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(selectedNotification.created_at), 'EEEE, MMMM dd, yyyy \'at\' HH:mm')}</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Title</p>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedNotification.title}</h3>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Message</p>
                  <p className="text-sm leading-7 text-gray-700 whitespace-pre-wrap break-words">
                    {selectedNotification.message}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Assigned</p>
                  <div className="flex flex-wrap gap-2">{renderAssignedUsers(selectedNotification.data)}</div>
                </div>

                {selectedNotification.sender && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">From</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedNotification.sender.name}</p>
                    <p className="text-sm text-gray-500 break-all">{selectedNotification.sender.email}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(selectedNotification.created_at), 'EEEE, MMMM dd, yyyy \'at\' HH:mm')}</span>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      <LeaveRequestApprovalModal
        isOpen={isLeaveApprovalModalOpen}
        onClose={() => {
          setIsLeaveApprovalModalOpen(false);
          setSelectedLeaveRequest(null);
        }}
        leaveRequest={selectedLeaveRequest}
        onSuccess={handleLeaveApprovalSuccess}
      />

      {/* Compose Modal */}
      <Modal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        title="Compose Notification"
        size="lg"
      >
        <div className="space-y-4">
          {/* Recipients Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients <span className="text-red-500">*</span>
            </label>
            
            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-[#222E6A] text-white hover:bg-[#1a2452] transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleSelectByRole('CNS')}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                CNS Only
              </button>
              <button
                type="button"
                onClick={() => handleSelectByRole('Support')}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              >
                Support Only
              </button>
              <button
                type="button"
                onClick={() => handleSelectByRole('Manager Teknik')}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              >
                Manager Teknik
              </button>
              <button
                type="button"
                onClick={() => handleSelectByRole('Admin')}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
              >
                Admin Only
              </button>
              {selectedUserIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {/* Selected Users Tags */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                {selectedUsers.map((user: User) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#222E6A] text-white rounded-full text-sm"
                  >
                    {user.name}
                    <button
                      onClick={() => handleRemoveSelectedUser(user.id)}
                      className="hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Search Input */}
            <div className="relative" ref={userDropdownRef}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  setIsUserDropdownOpen(true);
                }}
                onFocus={() => setIsUserDropdownOpen(true)}
                placeholder="Search users by name, email, or role..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
              />
              {/* Close button for dropdown */}
              {isUserDropdownOpen && (
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen(false)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              
              {/* User Dropdown */}
              {isUserDropdownOpen && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.map((user: User) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          handleToggleUserSelection(user.id);
                          setUserSearchQuery('');
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0 ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                            {user.role}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-[#222E6A]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-1">
              {selectedUserIds.length} user(s) selected
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={composeForm.title}
              onChange={(e) => setComposeForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter notification title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={composeForm.message}
              onChange={(e) => setComposeForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter notification description"
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent resize-none"
            />
          </div>

          {/* Send Email Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="send_email"
              checked={composeForm.send_email}
              onChange={(e) => setComposeForm(prev => ({ ...prev, send_email: e.target.checked }))}
              className="h-4 w-4 text-[#222E6A] border-gray-300 rounded focus:ring-[#222E6A]"
            />
            <label htmlFor="send_email" className="text-sm text-gray-700">
              Also send email notification
            </label>
          </div>

          {/* Send Mode Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send Options
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="send_now"
                  name="send_mode"
                  value="now"
                  checked={sendMode === 'now'}
                  onChange={(e) => setSendMode(e.target.value as 'now' | 'draft' | 'schedule')}
                  className="h-4 w-4 text-[#222E6A] border-gray-300 focus:ring-[#222E6A]"
                />
                <label htmlFor="send_now" className="text-sm text-gray-700">
                  Send Now
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="save_draft"
                  name="send_mode"
                  value="draft"
                  checked={sendMode === 'draft'}
                  onChange={(e) => setSendMode(e.target.value as 'now' | 'draft' | 'schedule')}
                  className="h-4 w-4 text-[#222E6A] border-gray-300 focus:ring-[#222E6A]"
                />
                <label htmlFor="save_draft" className="text-sm text-gray-700">
                  Save as Draft
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="schedule_send"
                  name="send_mode"
                  value="schedule"
                  checked={sendMode === 'schedule'}
                  onChange={(e) => setSendMode(e.target.value as 'now' | 'draft' | 'schedule')}
                  className="h-4 w-4 text-[#222E6A] border-gray-300 focus:ring-[#222E6A]"
                />
                <label htmlFor="schedule_send" className="text-sm text-gray-700">
                  Schedule Send
                </label>
              </div>
            </div>
          </div>

          {/* Scheduled Date & Time Picker */}
          {sendMode === 'schedule' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={scheduledDateTime.split('T')[0] || ''}
                  onChange={(e) => {
                    const time = scheduledDateTime.split('T')[1] || '00:00';
                    setScheduledDateTime(`${e.target.value}T${time}`);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time (WIB) <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={scheduledDateTime.split('T')[1] || ''}
                  onChange={(e) => {
                    const date = scheduledDateTime.split('T')[0] || new Date().toISOString().split('T')[0];
                    setScheduledDateTime(`${date}T${e.target.value}`);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222E6A] focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsComposeModalOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={sendMode === 'draft' ? handleSaveDraft : sendMode === 'schedule' ? handleScheduleNotification : handleSendNotification}
              disabled={isSending || (sendMode === 'schedule' && !scheduledDateTime)}
              className="bg-[#222E6A] hover:bg-[#1a2452]"
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {sendMode === 'draft' ? 'Saving...' : sendMode === 'schedule' ? 'Scheduling...' : 'Sending...'}
                </>
              ) : (
                <>
                  {sendMode === 'draft' ? (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Save Draft
                    </>
                  ) : sendMode === 'schedule' ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Send
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Now
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </PageHeader>
  );
};

export default NotificationsPage;

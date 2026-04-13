import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../repository/notificationService';
import { shiftRequestService } from '../../roster/repository/shiftRequestService';
import { leaveRequestService } from '../../roster/repository/leaveRequestService';
import { PageHeader, Button, Modal } from '../../../components';
import LeaveRequestApprovalModal from '../../../components/modals/roster/LeaveRequestApprovalModal';
import { useDataCache } from '../../../contexts/DataCacheContext';
import { useAuth } from '../../auth/core/AuthContext';
import type { User, Notification } from '../../../types';
import type { LeaveRequest } from '../../roster/types/leaveRequest';
import { 
  Inbox, Star, Send, Trash2, Mail, MailOpen, X, Clock, Plus, RefreshCw, Archive, Check, Search
} from 'lucide-react';
import { format } from 'date-fns';

type NotificationCategory = 'all' | 'inbox' | 'starred' | 'sent' | 'trash';

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
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);
  const [isLeaveApprovalModalOpen, setIsLeaveApprovalModalOpen] = useState(false);
  
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

  // Sync shift request status for actionable notifications (with debounce to avoid excessive API calls)
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
          .filter(n => n.category === 'shift_request' && !!n.reference_id)
          .map(n => n.reference_id as number)
      )
    );

    if (shiftRequestIds.length === 0) {
      setShiftRequestStatusById({});
      return;
    }

    let mounted = true;
    // Only fetch if we have actioned notifications, otherwise use cache as-is
    const timeoutId = setTimeout(async () => {
      const fetchStatuses = async () => {
        const results = await Promise.all(
          shiftRequestIds.map(async (id) => {
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

      await fetchStatuses();
    }, 500); // Debounce API calls by 500ms

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [activeCategory]);
  
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
    if (activeCategory === 'all') {
      // Combine inbox and sent notifications (starred items are already in inbox or sent)
      const inboxNotifications = notificationsByCategory.inbox || [];
      const sentNotifications = notificationsByCategory.sent || [];
      
      // Merge and deduplicate by id
      const allNotificationsMap = new Map<number, Notification>();
      inboxNotifications.forEach(n => allNotificationsMap.set(n.id, n));
      sentNotifications.forEach(n => allNotificationsMap.set(n.id, n));
      
      // Convert to array and sort by date (newest first)
      return Array.from(allNotificationsMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return notificationsByCategory[activeCategory] || [];
  }, [activeCategory, notificationsByCategory]);
  
  const stats = notificationStats;
  const isLoading = loadingStates.notifications;
  const isManager = user?.role === 'Manager Teknik' || user?.role === 'General Manager';

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
    
    try {
      // Optimistic update
      updateNotificationInCache(notification.id, { is_read: true, read_at: new Date().toISOString() });
      
      await notificationService.markAsRead(notification.id);
    } catch (error: any) {
      // Revert on error
      updateNotificationInCache(notification.id, { is_read: false, read_at: null });
      toast.error(error.response?.data?.message || 'Failed to mark as read');
    }
  };

  const handleDelete = async (notification: Notification) => {
    try {
      // Determine actual category for the cache update
      // 'all' is just a UI display category, actual data is in inbox or sent
      let fromCategory: 'inbox' | 'starred' | 'sent' | 'trash' = 'inbox';
      if (activeCategory === 'all') {
        // Check if notification is in inbox or sent based on type
        fromCategory = notification.type === 'sent' ? 'sent' : 'inbox';
      } else {
        fromCategory = activeCategory;
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

  const handleRestore = async (notification: Notification) => {
    try {
      // Optimistic update - restore to inbox locally
      restoreNotificationFromTrash(notification);
      
      await notificationService.restoreNotification(notification.id);
      toast.success('Notification restored');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore');
      // Refresh to restore state on error
      await refreshNotificationsByCategory();
    }
  };

  const handlePermanentDelete = async (notification: Notification) => {
    if (!confirm('Are you sure you want to permanently delete this notification?')) return;
    
    try {
      // Optimistic update - remove from trash locally
      removeNotificationFromCategory(notification.id, 'trash');
      
      await notificationService.permanentDelete(notification.id);
      toast.success('Permanently deleted');
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

  const handleOpenCompose = () => {
    setComposeForm({ title: '', message: '', send_email: false });
    setSelectedUserIds([]);
    setUserSearchQuery('');
    setIsComposeModalOpen(true);
  };

  const allCategories = [
    { 
      key: 'all' as NotificationCategory,
      label: 'All', 
      icon: Archive, 
      count: stats.inbox + stats.sent, // Inbox + Sent (non-duplicated)
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
      {/* Desktop View - Grid */}
      <div className="hidden md:grid md:grid-cols-5 gap-4 mb-6">
        {[...allCategories, ...categories].map((category) => {
          const Icon = category.icon;
          const isActive = category.key !== 'all' && activeCategory === category.key;
          
          return (
            <button
              key={category.key}
              onClick={() => handleCategoryChange(category.key === 'all' ? 'inbox' : category.key)}
              className={`bg-gradient-to-br ${category.bgGradient} rounded-xl border-2 ${category.borderColor} p-5 transition-all duration-200 cursor-pointer ${
                isActive 
                  ? `shadow-xl scale-105`
                  : `hover:shadow-md hover:scale-[1.02] opacity-70 hover:opacity-100`
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 w-12 h-12 ${category.iconBg} rounded-lg flex items-center justify-center border-2 ${category.iconBorder}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-semibold ${category.textColor} mb-0.5`}>{category.label}</p>
                  <p className={`text-3xl font-bold ${category.countColor}`}>{category.count}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile View - Horizontal Pills */}
      <div className="md:hidden mb-0 relative">
        <div className="flex gap-2 pb-2 overflow-x-auto">
          {[...allCategories, ...categories].map((category) => {
            const isActive = category.key !== 'all' && activeCategory === category.key;
            
            return (
              <button
                key={category.key}
                onClick={() => handleCategoryChange(category.key === 'all' ? 'inbox' : category.key as NotificationCategory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-200 whitespace-nowrap ${
                  isActive 
                    ? `bg-gradient-to-br ${category.bgGradient} ${category.borderColor} shadow-md`
                    : `bg-white ${category.borderColor} opacity-60 hover:opacity-100`
                }`}
              >
                <span className={`text-sm font-semibold ${category.textColor}`}>
                  {category.label}
                </span>
                <span className={`text-sm font-bold ${category.textColor}`}>
                  {category.count}
                </span>
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
            <Button
              variant="primary"
              onClick={handleOpenCompose}
              className="bg-[#222E6A] hover:bg-[#1a2452] text-xs px-2 py-1.5 sm:text-base sm:px-4 sm:py-2"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="ml-1 sm:ml-2">Compose</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No notifications in {activeCategory}</p>
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
                          {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
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

      {/* Detail Modal */}
      {selectedNotification && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedNotification(null);
          }}
          title={selectedNotification.title}
          size="md"
        >
          <div className="space-y-4">
            {selectedNotification.sender && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>From:</strong> {selectedNotification.sender.name} <span className="break-all">({selectedNotification.sender.email})</span>
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-700 whitespace-pre-wrap break-words">{selectedNotification.message}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(selectedNotification.created_at), 'EEEE, MMMM dd, yyyy \'at\' HH:mm')}</span>
            </div>
          </div>
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
              value={composeForm.message}
              onChange={(e) => setComposeForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter notification message"
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
              onClick={handleSendNotification}
              disabled={isSending}
              className="bg-[#222E6A] hover:bg-[#1a2452]"
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
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

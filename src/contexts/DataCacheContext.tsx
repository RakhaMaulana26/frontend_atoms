import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User, Notification, RosterPeriod } from '../types';
import type { ActivityLog, ActivityLogStatistics } from '../services/activityLogService';
import { adminService } from '../services/adminService';
import { notificationService } from '../modules/notifications/repository/notificationService';
import { rosterService } from '../modules/roster/repository/rosterService';
import { activityLogService } from '../services/activityLogService';
import { useAuth } from '../modules/auth/core/AuthContext';

type NotificationCategory = 'inbox' | 'starred' | 'sent' | 'trash';

interface NotificationsByCategory {
  inbox: Notification[];
  starred: Notification[];
  sent: Notification[];
  trash: Notification[];
}

interface NotificationStats {
  inbox: number;
  starred: number;
  sent: number;
  trash: number;
}

interface DataCacheContextType {
  users: User[];
  notifications: Notification[];
  notificationsByCategory: NotificationsByCategory;
  notificationStats: NotificationStats;
  rosters: RosterPeriod[];
  recentActivities: ActivityLog[];
  activityStatistics: ActivityLogStatistics | null;
  unreadNotificationCount: number;
  isLoading: boolean;
  isInitialized: boolean;
  loadingStates: {
    users: boolean;
    notifications: boolean;
    rosters: boolean;
    activities: boolean;
  };
  systemStats: {
    totalUsers: number;
    activeUsers: number;
    totalRosters: number;
    pendingTasks: number;
  };
  loadUsers: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadNotificationsByCategory: (category?: NotificationCategory) => Promise<void>;
  loadRosters: () => Promise<void>;
  loadRecentActivities: () => Promise<void>;
  loadActivityStatistics: () => Promise<void>;
  loadAllData: () => Promise<void>;
  addUser: (user: User) => void;
  updateUser: (userId: number | string, updatedUser: User) => void;
  removeUser: (userId: number | string) => void;
  replaceUser: (tempId: number, realUser: User) => void;
  refreshUsers: () => Promise<void>;
  markNotificationAsRead: (id: number) => void;
  markAllNotificationsAsRead: () => void;
  refreshNotifications: () => Promise<void>;
  refreshNotificationsByCategory: (category?: NotificationCategory) => Promise<void>;
  toggleNotificationStar: (id: number) => void;
  removeNotificationFromCategory: (id: number, category: NotificationCategory) => void;
  moveNotificationToTrash: (id: number, fromCategory: NotificationCategory) => void;
  restoreNotificationFromTrash: (notification: Notification) => void;
  addNotificationToSent: (notification: Notification) => void;
  updateNotificationInCache: (id: number, updates: Partial<Notification>) => void;
  refreshRosters: () => Promise<void>;
  refreshActivities: () => Promise<void>;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

export const DataCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsByCategory, setNotificationsByCategory] = useState<NotificationsByCategory>({
    inbox: [],
    starred: [],
    sent: [],
    trash: [],
  });
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({
    inbox: 0,
    starred: 0,
    sent: 0,
    trash: 0,
  });
  const [rosters, setRosters] = useState<RosterPeriod[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [activityStatistics, setActivityStatistics] = useState<ActivityLogStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    users: false,
    notifications: false,
    rosters: false,
    activities: false
  });
  const { isAuthenticated } = useAuth();

  // Calculate unread notifications count from inbox category
  const unreadNotificationCount = useMemo(() => {
    // Prioritize notificationsByCategory.inbox for accurate count
    const inboxNotifications = notificationsByCategory.inbox;
    if (inboxNotifications.length > 0) {
      return inboxNotifications.filter(n => !n.is_read).length;
    }
    // Fallback to general notifications
    return notifications.filter(n => !n.is_read).length;
  }, [notificationsByCategory.inbox, notifications]);

  // Calculate system stats
  const systemStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.is_active).length,
    totalRosters: rosters.length,
    pendingTasks: notifications.filter(n => !n.is_read).length
  };

  // Load users data when first time or when user login
  const loadUsers = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoadingStates(prev => ({ ...prev, users: true }));
    try {
      // Request all users without pagination for caching
      const response = await adminService.getUsers({ all: 'true' });
      // Handle both array and pagination response
      const usersData = Array.isArray(response) ? response : (response.data || []);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users cache:', error);
      setUsers([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, users: false }));
    }
  }, [isAuthenticated]);

  // Load rosters data
  const loadRosters = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoadingStates(prev => ({ ...prev, rosters: true }));
    try {
      const response: any = await rosterService.getRosters();
      // Handle direct array response
      if (Array.isArray(response)) {
        setRosters(response);
      } else if (response?.data && Array.isArray(response.data)) {
        setRosters(response.data);
      } else {
        setRosters([]);
      }
    } catch (error) {
      console.error('Failed to load rosters cache:', error);
      setRosters([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, rosters: false }));
    }
  }, [isAuthenticated]);

  // Load notifications data
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoadingStates(prev => ({ ...prev, notifications: true }));
    try {
      const response = await notificationService.getNotifications();
      
      // Handle paginated response - extract data array
      if (response && response.data && Array.isArray(response.data)) {
        setNotifications(response.data);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to load notifications cache:', error);
      setNotifications([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, notifications: false }));
    }
  }, [isAuthenticated]);

  // Load notifications by category (all categories at once)
  const loadNotificationsByCategory = useCallback(async (singleCategory?: NotificationCategory) => {
    if (!isAuthenticated) return;
    
    setLoadingStates(prev => ({ ...prev, notifications: true }));
    try {
      if (singleCategory) {
        // Load only one category
        const response = await notificationService.getNotifications({ category: singleCategory });
        const data = response?.data || [];
        const total = response?.total || 0;
        
        setNotificationsByCategory(prev => ({
          ...prev,
          [singleCategory]: data,
        }));
        setNotificationStats(prev => ({
          ...prev,
          [singleCategory]: total,
        }));
      } else {
        // Load all categories in parallel
        const [inboxRes, starredRes, sentRes, trashRes] = await Promise.all([
          notificationService.getNotifications({ category: 'inbox' }),
          notificationService.getNotifications({ category: 'starred' }),
          notificationService.getNotifications({ category: 'sent' }),
          notificationService.getNotifications({ category: 'trash' }),
        ]);
        
        setNotificationsByCategory({
          inbox: inboxRes?.data || [],
          starred: starredRes?.data || [],
          sent: sentRes?.data || [],
          trash: trashRes?.data || [],
        });
        
        setNotificationStats({
          inbox: inboxRes?.total || 0,
          starred: starredRes?.total || 0,
          sent: sentRes?.total || 0,
          trash: trashRes?.total || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load notifications by category:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, notifications: false }));
    }
  }, [isAuthenticated]);

  // Load recent activities data
  const loadRecentActivities = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoadingStates(prev => ({ ...prev, activities: true }));
    try {
      const response = await activityLogService.getRecentActivities();
      if (response && response.data && Array.isArray(response.data)) {
        setRecentActivities(response.data);
      } else {
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('Failed to load activities cache:', error);
      setRecentActivities([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, activities: false }));
    }
  }, [isAuthenticated]);

  // Load activity statistics
  const loadActivityStatistics = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await activityLogService.getStatistics();
      if (response && response.data) {
        setActivityStatistics(response.data);
      } else {
        setActivityStatistics(null);
      }
    } catch (error) {
      console.error('Failed to load activity statistics:', error);
      setActivityStatistics(null);
    }
  }, [isAuthenticated]);

  // Load all data
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadNotifications(),
        loadNotificationsByCategory(),
        loadRosters(),
        loadRecentActivities(),
        loadActivityStatistics()
      ]);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, loadUsers, loadNotifications, loadNotificationsByCategory, loadRosters, loadRecentActivities, loadActivityStatistics]);

  // Auto-load when user authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      loadAllData();
    }
    
    // Reset cache when user logs out
    if (!isAuthenticated && isInitialized) {
      // Clear all cached data
      setUsers([]);
      setNotifications([]);
      setNotificationsByCategory({
        inbox: [],
        starred: [],
        sent: [],
        trash: [],
      });
      setNotificationStats({
        inbox: 0,
        starred: 0,
        sent: 0,
        trash: 0,
      });
      setRosters([]);
      setRecentActivities([]);
      setActivityStatistics(null);
      setIsInitialized(false);
    }
  }, [isAuthenticated, isInitialized, loadAllData]);

  // Add new user to cache
  const addUser = useCallback((user: User) => {
    setUsers(prev => [user, ...prev]);
  }, []);

  // Update existing user in cache
  const updateUser = useCallback((userId: number | string, updatedUser: User) => {
    setUsers(prev => prev.map(u => String(u.id) === String(userId) ? updatedUser : u));
  }, []);

  // Remove user from cache
  const removeUser = useCallback((userId: number | string) => {
    setUsers(prev => prev.filter(u => String(u.id) !== String(userId)));
  }, []);

  // Replace temporary user with real user (for optimistic create)
  const replaceUser = useCallback((tempId: number, realUser: User) => {
    setUsers(prev => prev.map(u => u.id === tempId ? realUser : u));
  }, []);

  // Refresh users from server
  const refreshUsers = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await adminService.getUsers({});
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to refresh users:', error);
    }
  }, [isAuthenticated]);

  // Mark notification as read
  const markNotificationAsRead = useCallback((id: number) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
    ));
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => 
      !n.is_read ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
    ));
  }, []);

  // Refresh notifications from server
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await notificationService.getNotifications();
      
      // Handle paginated response - extract data array
      if (response && response.data && Array.isArray(response.data)) {
        setNotifications(response.data);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  }, [isAuthenticated]);

  // Refresh notifications by category
  const refreshNotificationsByCategory = useCallback(async (category?: NotificationCategory) => {
    await loadNotificationsByCategory(category);
  }, [loadNotificationsByCategory]);

  // Toggle notification star in cache
  const toggleNotificationStar = useCallback((id: number) => {
    setNotificationsByCategory(prev => {
      const newState = { ...prev };
      
      // Find the notification in any category
      let targetNotification: Notification | undefined;
      
      (['inbox', 'starred', 'sent', 'trash'] as NotificationCategory[]).forEach(cat => {
        const found = prev[cat].find(n => n.id === id);
        if (found && !targetNotification) {
          targetNotification = found;
        }
      });
      
      if (!targetNotification) return prev;
      
      const newStarredStatus = !targetNotification.is_starred;
      
      // Update is_starred in all categories where notification exists
      (['inbox', 'starred', 'sent', 'trash'] as NotificationCategory[]).forEach(cat => {
        newState[cat] = prev[cat].map(n => 
          n.id === id ? { ...n, is_starred: newStarredStatus } : n
        );
      });
      
      // If starring: add to starred category if not already there
      if (newStarredStatus) {
        const alreadyInStarred = prev.starred.some(n => n.id === id);
        if (!alreadyInStarred) {
          newState.starred = [{ ...targetNotification, is_starred: true }, ...newState.starred];
        }
      } else {
        // If unstarring: remove from starred category
        newState.starred = newState.starred.filter(n => n.id !== id);
      }
      
      return newState;
    });
    
    // Update stats for starred category
    setNotificationStats(prev => {
      // Find notification to check current star status
      let isCurrentlyStarred = false;
      (['inbox', 'sent', 'starred', 'trash'] as NotificationCategory[]).some(cat => {
        const found = notificationsByCategory[cat]?.find(n => n.id === id);
        if (found) {
          isCurrentlyStarred = found.is_starred;
          return true;
        }
        return false;
      });
      
      // Toggle: if currently starred, decrease count; if not, increase
      return {
        ...prev,
        starred: isCurrentlyStarred ? Math.max(0, prev.starred - 1) : prev.starred + 1,
      };
    });
  }, [notificationsByCategory]);

  // Remove notification from a category in cache
  const removeNotificationFromCategory = useCallback((id: number, category: NotificationCategory) => {
    setNotificationsByCategory(prev => ({
      ...prev,
      [category]: prev[category].filter(n => n.id !== id),
    }));
    setNotificationStats(prev => ({
      ...prev,
      [category]: Math.max(0, prev[category] - 1),
    }));
  }, []);

  // Move notification to trash (remove from ALL categories, add to trash)
  const moveNotificationToTrash = useCallback((id: number, fromCategory: NotificationCategory) => {
    setNotificationsByCategory(prev => {
      // Find notification from the source category
      const notification = prev[fromCategory].find(n => n.id === id);
      if (!notification) return prev;
      
      // Remove from ALL categories (inbox, starred, sent) since notification can exist in multiple
      return {
        inbox: prev.inbox.filter(n => n.id !== id),
        starred: prev.starred.filter(n => n.id !== id),
        sent: prev.sent.filter(n => n.id !== id),
        trash: [{ ...notification, deleted_at: new Date().toISOString() }, ...prev.trash],
      };
    });
    
    // Update stats - decrement for categories where notification existed
    setNotificationStats(prev => ({
      ...prev,
      [fromCategory]: Math.max(0, prev[fromCategory] - 1),
      trash: prev.trash + 1,
    }));
  }, []);

  // Restore notification from trash to inbox
  const restoreNotificationFromTrash = useCallback((notification: Notification) => {
    setNotificationsByCategory(prev => ({
      ...prev,
      trash: prev.trash.filter(n => n.id !== notification.id),
      inbox: [{ ...notification, deleted_at: null }, ...prev.inbox],
    }));
    setNotificationStats(prev => ({
      ...prev,
      trash: Math.max(0, prev.trash - 1),
      inbox: prev.inbox + 1,
    }));
  }, []);

  // Add notification to sent category
  const addNotificationToSent = useCallback((notification: Notification) => {
    setNotificationsByCategory(prev => ({
      ...prev,
      sent: [notification, ...prev.sent],
    }));
    setNotificationStats(prev => ({
      ...prev,
      sent: prev.sent + 1,
    }));
  }, []);

  // Update notification in all categories
  const updateNotificationInCache = useCallback((id: number, updates: Partial<Notification>) => {
    setNotificationsByCategory(prev => {
      const newState = { ...prev };
      (['inbox', 'starred', 'sent', 'trash'] as NotificationCategory[]).forEach(cat => {
        newState[cat] = prev[cat].map(n => 
          n.id === id ? { ...n, ...updates } : n
        );
      });
      return newState;
    });
  }, []);

  // Refresh rosters from server
  const refreshRosters = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response: any = await rosterService.getRosters();
      // Handle direct array response
      if (Array.isArray(response)) {
        setRosters(response);
      } else if (response?.data && Array.isArray(response.data)) {
        setRosters(response.data);
      } else {
        setRosters([]);
      }
    } catch (error) {
      console.error('Failed to refresh rosters:', error);
    }
  }, [isAuthenticated]);

  // Refresh activities from server
  const refreshActivities = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const [activitiesResponse, statisticsResponse] = await Promise.all([
        activityLogService.getRecentActivities(),
        activityLogService.getStatistics()
      ]);

      if (activitiesResponse && activitiesResponse.data && Array.isArray(activitiesResponse.data)) {
        setRecentActivities(activitiesResponse.data);
      } else {
        setRecentActivities([]);
      }

      if (statisticsResponse && statisticsResponse.data) {
        setActivityStatistics(statisticsResponse.data);
      } else {
        setActivityStatistics(null);
      }
    } catch (error) {
      console.error('Failed to refresh activities:', error);
    }
  }, [isAuthenticated]);

  return (
    <DataCacheContext.Provider
      value={{
        users,
        notifications,
        notificationsByCategory,
        notificationStats,
        rosters,
        recentActivities,
        activityStatistics,
        unreadNotificationCount,
        isLoading,
        isInitialized,
        loadingStates,
        systemStats,
        loadUsers,
        loadNotifications,
        loadNotificationsByCategory,
        loadRosters,
        loadRecentActivities,
        loadActivityStatistics,
        loadAllData,
        addUser,
        updateUser,
        removeUser,
        replaceUser,
        refreshUsers,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshNotifications,
        refreshNotificationsByCategory,
        toggleNotificationStar,
        removeNotificationFromCategory,
        moveNotificationToTrash,
        restoreNotificationFromTrash,
        addNotificationToSent,
        updateNotificationInCache,
        refreshRosters,
        refreshActivities,
      }}
    >
      {children}
    </DataCacheContext.Provider>
  );
};

export const useDataCache = (): DataCacheContextType => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
};

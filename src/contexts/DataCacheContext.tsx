import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Notification, RosterPeriod } from '../types';
import type { ActivityLog, ActivityLogStatistics } from '../services/activityLogService';
import { adminService } from '../modules/admin/repository/adminService';
import { notificationService } from '../modules/notifications/repository/notificationService';
import { rosterService } from '../modules/roster/repository/rosterService';
import { activityLogService } from '../services/activityLogService';
import { useAuth } from '../modules/auth/core/AuthContext';

interface DataCacheContextType {
  users: User[];
  notifications: Notification[];
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
  loadRosters: () => Promise<void>;
  loadRecentActivities: () => Promise<void>;
  loadActivityStatistics: () => Promise<void>;
  loadAllData: () => Promise<void>;
  addUser: (user: User) => void;
  updateUser: (userId: number, updatedUser: User) => void;
  removeUser: (userId: number) => void;
  replaceUser: (tempId: number, realUser: User) => void;
  refreshUsers: () => Promise<void>;
  markNotificationAsRead: (id: number) => void;
  markAllNotificationsAsRead: () => void;
  refreshNotifications: () => Promise<void>;
  refreshRosters: () => Promise<void>;
  refreshActivities: () => Promise<void>;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

export const DataCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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

  // Calculate unread notifications count
  const unreadNotificationCount = notifications.filter(n => !n.is_read).length;

  // Calculate system stats
  const systemStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.is_active).length,
    totalRosters: rosters.length,
    pendingTasks: notifications.filter(n => !n.is_read && n.type === 'task').length
  };

  // Load users data when first time or when user login
  const loadUsers = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoadingStates(prev => ({ ...prev, users: true }));
    try {
      const response = await adminService.getUsers({});
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users cache:', error);
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
  }, [isAuthenticated, loadUsers, loadNotifications, loadRosters, loadRecentActivities, loadActivityStatistics]);

  // Auto-load when user authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      loadAllData();
    }
  }, [isAuthenticated, isInitialized, loadAllData]);

  // Add new user to cache
  const addUser = useCallback((user: User) => {
    setUsers(prev => [user, ...prev]);
  }, []);

  // Update existing user in cache
  const updateUser = useCallback((userId: number, updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
  }, []);

  // Remove user from cache
  const removeUser = useCallback((userId: number) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
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

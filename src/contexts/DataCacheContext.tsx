import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Notification, RosterPeriod } from '../types';
import { adminService } from '../modules/admin/repository/adminService';
import { notificationService } from '../modules/notifications/repository/notificationService';
import { rosterService } from '../modules/roster/repository/rosterService';
import { useAuth } from '../modules/auth/core/AuthContext';

interface DataCacheContextType {
  users: User[];
  notifications: Notification[];
  rosters: RosterPeriod[];
  unreadNotificationCount: number;
  isLoading: boolean;
  isInitialized: boolean;
  loadingStates: {
    users: boolean;
    notifications: boolean;
    rosters: boolean;
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
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

export const DataCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rosters, setRosters] = useState<RosterPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    users: false,
    notifications: false,
    rosters: false
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

  // Load all data
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadNotifications(),
        loadRosters()
      ]);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, loadUsers, loadNotifications, loadRosters]);

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

  return (
    <DataCacheContext.Provider
      value={{
        users,
        notifications,
        rosters,
        unreadNotificationCount,
        isLoading,
        isInitialized,
        loadingStates,
        systemStats,
        loadUsers,
        loadNotifications,
        loadRosters,
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

import { useState, useEffect } from 'react';
import { activityLogService, type ActivityLog } from '../services/activityLogService';

interface UseRecentActivitiesReturn {
  activities: ActivityLog[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useRecentActivities = (): UseRecentActivitiesReturn => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await activityLogService.getRecentActivities();
      setActivities(response.data);
    } catch (error: any) {
      console.error('Error fetching recent activities:', error);
      setError('Failed to load recent activities');
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    await fetchActivities();
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return {
    activities,
    isLoading,
    error,
    refetch,
  };
};
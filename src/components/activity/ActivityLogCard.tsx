import React from 'react';
import { Calendar, Users, AlertTriangle, Package, Settings, LogIn, UserPlus, Edit, Trash2, RotateCcw, Send, Check, X } from 'lucide-react';
import type { ActivityLog } from '../../services/activityLogService';

interface ActivityLogCardProps {
  activity: ActivityLog;
  isCompact?: boolean;
}

const getActivityIcon = (action: string, module: string) => {
  const actionLower = action.toLowerCase();
  const moduleLower = module.toLowerCase();

  // Module-based icons
  if (moduleLower.includes('roster')) return Calendar;
  if (moduleLower.includes('user') || moduleLower.includes('auth')) return Users;
  if (moduleLower.includes('notification')) return Send;
  if (moduleLower.includes('shift')) return RotateCcw;

  // Action-based icons  
  if (actionLower.includes('login')) return LogIn;
  if (actionLower.includes('create') || actionLower.includes('add')) return UserPlus;
  if (actionLower.includes('update') || actionLower.includes('edit')) return Edit;
  if (actionLower.includes('delete')) return Trash2;
  if (actionLower.includes('restore')) return RotateCcw;
  if (actionLower.includes('approve')) return Check;
  if (actionLower.includes('reject')) return X;
  if (actionLower.includes('urgent') || actionLower.includes('maintenance')) return AlertTriangle;
  if (actionLower.includes('inventory') || actionLower.includes('stock')) return Package;
  
  return Settings; // Default icon
};

const getActivityColor = (action: string, module: string) => {
  const actionLower = action.toLowerCase();
  const moduleLower = module.toLowerCase();

  // Urgent/Error activities
  if (actionLower.includes('delete') || actionLower.includes('urgent') || actionLower.includes('maintenance')) {
    return {
      bg: 'bg-red-50',
      icon: 'bg-red-500',
      border: 'border-red-200',
      gradient: 'from-red-500/5 to-orange-500/5'
    };
  }

  // Success/Approval activities
  if (actionLower.includes('approve') || actionLower.includes('complete') || actionLower.includes('restore')) {
    return {
      bg: 'bg-green-50',
      icon: 'bg-green-500',
      border: 'border-green-200', 
      gradient: 'from-green-500/5 to-emerald-500/5'
    };
  }

  // Warning activities
  if (actionLower.includes('reject') || actionLower.includes('pending')) {
    return {
      bg: 'bg-yellow-50',
      icon: 'bg-yellow-500',
      border: 'border-yellow-200',
      gradient: 'from-yellow-500/5 to-orange-500/5'
    };
  }

  // Module-based colors
  if (moduleLower.includes('roster')) {
    return {
      bg: 'bg-gradient-to-r from-[#222E6A]/5 to-[#454D7C]/5',
      icon: 'bg-[#222E6A]',
      border: 'border-[#222E6A]/10',
      gradient: 'from-[#222E6A]/5 to-[#454D7C]/5'
    };
  }

  if (moduleLower.includes('user')) {
    return {
      bg: 'bg-gradient-to-r from-[#454D7C]/5 to-purple-500/5',
      icon: 'bg-[#454D7C]',
      border: 'border-[#454D7C]/10',
      gradient: 'from-[#454D7C]/5 to-purple-500/5'
    };
  }

  // Default primary colors
  return {
    bg: 'bg-gradient-to-r from-[#222E6A]/5 to-[#454D7C]/5',
    icon: 'bg-[#222E6A]',
    border: 'border-[#222E6A]/10',
    gradient: 'from-[#222E6A]/5 to-[#454D7C]/5'
  };
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (weeks < 4) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
};

const ActivityLogCard: React.FC<ActivityLogCardProps> = ({ activity, isCompact = false }) => {
  const Icon = getActivityIcon(activity.action, activity.module);
  const colors = getActivityColor(activity.action, activity.module);

  return (
    <div className={`
      flex items-start gap-4 p-4 rounded-lg transition-all hover:shadow-sm
      bg-gradient-to-r ${colors.gradient} border ${colors.border}
      ${isCompact ? 'p-3' : 'p-4'}
    `}>
      <div className={`
        flex-shrink-0 w-10 h-10 ${colors.icon} rounded-full flex items-center justify-center shadow-sm
        ${isCompact ? 'w-8 h-8' : 'w-10 h-10'}
      `}>
        <Icon className={`text-white ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-gray-900 leading-snug ${isCompact ? 'text-sm' : 'text-base'}`}>
          {activity.description}
        </p>
        <div className={`flex items-center gap-3 mt-1 ${isCompact ? 'text-xs' : 'text-sm'}`}>
          <span className="text-gray-600">
            {formatTimeAgo(activity.created_at)}
          </span>
          {activity.user && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">
                by {activity.user.name}
              </span>
            </>
          )}
          <span className="text-gray-400">•</span>
          <span className={`px-2 py-0.5 bg-white/50 text-gray-700 rounded-full font-medium ${
            isCompact ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
          }`}>
            {activity.module}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogCard;
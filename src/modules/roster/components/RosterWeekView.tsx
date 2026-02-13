/**
 * RosterWeekView Component
 * 
 * Weekly roster view with shift assignments
 * Shows 7-day grid with staff per shift
 */

import React from 'react';
import type { RosterDay, Shift } from '../types/roster';
import ShiftAssignmentCard from './ShiftAssignmentCard';

interface RosterWeekViewProps {
  weekDays: Date[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  rosterDay?: RosterDay;
  shifts: Shift[];
  isReadOnly?: boolean;
  onAddStaff?: (shiftId: number) => void;
  onRemoveStaff?: (assignmentId: number) => void;
}

const RosterWeekView: React.FC<RosterWeekViewProps> = ({
  weekDays,
  selectedDate,
  onDateSelect,
  onNavigateWeek,
  rosterDay,
  shifts,
  isReadOnly = false,
  onAddStaff,
  onRemoveStaff
}) => {
  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const getShiftColor = (shiftName: string): string => {
    const name = shiftName.toLowerCase();
    if (name.includes('morning') || name.includes('pagi')) return 'bg-blue-500';
    if (name.includes('afternoon') || name.includes('siang')) return 'bg-yellow-400';
    if (name.includes('night') || name.includes('malam')) return 'bg-green-500';
    return 'bg-purple-500';
  };

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return nameParts[0][0] + nameParts[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 -mx-4 sm:mx-0 p-4 sm:p-6 lg:p-8">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <button
          onClick={() => onNavigateWeek('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous week"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">This Week</h3>
        
        <button
          onClick={() => onNavigateWeek('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next week"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Week Days Selector */}
      <div className="grid grid-cols-7 gap-1 mb-6 sm:mb-8 overflow-x-auto">
        {weekDays.map((day, index) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              className={`flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 rounded-lg transition-all text-center ${
                isSelected
                  ? 'bg-[#222E6A] text-white shadow-lg'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              } ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}`}
            >
              <span className="text-xs font-medium mb-0.5">{formatDayName(day)}</span>
              <span className="text-lg sm:text-xl font-bold">{day.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* Manager Info (if available) */}
      {rosterDay?.manager_duties && rosterDay.manager_duties.length > 0 && (() => {
        const uniqueManagers = rosterDay.manager_duties.reduce((acc, duty) => {
          if (!acc.find(d => d.employee_id === duty.employee_id)) acc.push(duty);
          return acc;
        }, [] as typeof rosterDay.manager_duties);
        return (
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl border border-orange-100">
              <div className="flex -space-x-2">
                {uniqueManagers.slice(0, 3).map((duty) => (
                  <div key={duty.id} className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white">
                    {getUserInitials(duty.employee.user.name)}
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">
                  {uniqueManagers.map(d => d.employee.user.name).join(', ')}
                </h4>
                <p className="text-sm text-gray-600">
                  {uniqueManagers.length} Manager(s) • Assigned per shift
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* No Manager Warning */}
      {rosterDay && (!rosterDay.manager_duties || rosterDay.manager_duties.length === 0) && !isReadOnly && (
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-800">No manager assigned to this day yet</p>
          </div>
        </div>
      )}

      {/* Shifts Grid */}
      {rosterDay ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {shifts.map((shift) => {
            const assignments = rosterDay.shift_assignments?.filter(a => a.shift_id === shift.id) || [];
            const shiftManagerDuties = rosterDay.manager_duties?.filter(d => d.shift_id === shift.id) || [];
            const bgColor = getShiftColor(shift.name);
            
            return (
              <ShiftAssignmentCard
                key={shift.id}
                shift={shift}
                assignments={assignments}
                managerDuties={shiftManagerDuties}
                backgroundColor={bgColor}
                isReadOnly={isReadOnly}
                onAddStaff={onAddStaff ? () => onAddStaff(shift.id) : undefined}
                onRemoveStaff={onRemoveStaff}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">Select a date to view roster</p>
        </div>
      )}
    </div>
  );
};

export { RosterWeekView };
export default RosterWeekView;

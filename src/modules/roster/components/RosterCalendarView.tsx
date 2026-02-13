/**
 * RosterCalendarView Component
 * 
 * Monthly calendar grid for roster visualization
 * Shows shifts for each day with color coding
 */

import React from 'react';
import { Printer } from 'lucide-react';
import type { RosterPeriod, Shift } from '../types/roster';

interface RosterCalendarViewProps {
  roster: RosterPeriod;
  shifts: Shift[]; // For future use with shift legends
  onPrint?: () => void;
  currentEmployeeId?: number; // Optional: Filter shifts by this employee
}

const RosterCalendarView: React.FC<RosterCalendarViewProps> = ({
  roster,
  onPrint,
  currentEmployeeId
}) => {
  const getMonthName = (month: number) => {
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month - 1, 1).getDay();
    // Convert Sunday=0 to Sunday=6 (Monday-first week)
    return day === 0 ? 6 : day - 1;
  };

  const getShiftColor = (shiftName: string): string => {
    const name = shiftName.toLowerCase();
    if (name.includes('morning') || name.includes('pagi')) return 'bg-blue-500';
    if (name.includes('afternoon') || name.includes('siang')) return 'bg-yellow-400';
    if (name.includes('night') || name.includes('malam')) return 'bg-green-500';
    return 'bg-red-500'; // Off day or no assignment
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(roster.year, roster.month);
    const firstDay = getFirstDayOfMonth(roster.year, roster.month);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Get previous month days count
    const prevMonthDays = getDaysInMonth(roster.year, roster.month === 1 ? 12 : roster.month - 1);
    const prevMonthEmptyDays = Array.from(
      { length: firstDay },
      (_, i) => prevMonthDays - firstDay + i + 1
    );

    // Create map of dates to shifts
    const dateShiftMap = new Map<number, string>();
    roster.roster_days?.forEach(day => {
      const dateObj = new Date(day.work_date);
      const dayOfMonth = dateObj.getDate();
      
      // Filter assignments by current employee if provided
      let assignments = day.shift_assignments || [];
      if (currentEmployeeId) {
        assignments = assignments.filter(a => a.employee_id === currentEmployeeId);
      }
      
      // Get shift name (or 'off' if no assignments)
      if (assignments.length > 0) {
        const shiftName = assignments[0].shift.name;
        dateShiftMap.set(dayOfMonth, shiftName);
      } else {
        dateShiftMap.set(dayOfMonth, 'off');
      }
    });

    // Group days into weeks
    const weeks: (number | string)[][] = [];
    let currentWeek: (number | string)[] = [];
    
    // Add previous month days
    prevMonthEmptyDays.forEach(day => {
      currentWeek.push(`prev-${day}`);
    });
    
    // Add current month days
    for (const day of daysArray) {
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
      currentWeek.push(day);
    }
    
    // Fill remaining slots with next month
    let nextMonthDay = 1;
    while (currentWeek.length < 7) {
      currentWeek.push(`next-${nextMonthDay}`);
      nextMonthDay++;
    }
    weeks.push(currentWeek);

    return (
      <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-12 shadow-lg border border-gray-100 -mx-7 sm:mx-0" style={{ backgroundColor: '#222E6A' }}>
        {/* Header */}
        <div className="flex items-center justify-center mb-4 sm:mb-8 lg:mb-12">
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white">
            {getMonthName(roster.month)}
          </h2>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <table className="w-full border-collapse mx-auto">
            <colgroup>
              <col style={{ width: '14.28%' }} />
              <col style={{ width: '14.28%' }} />
              <col style={{ width: '14.28%' }} />
              <col style={{ width: '14.28%' }} />
              <col style={{ width: '14.28%' }} />
              <col style={{ width: '14.28%' }} />
              <col style={{ width: '14.28%' }} />
            </colgroup>
            <thead>
              <tr>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                  <th key={day} className="text-center font-semibold text-white text-xs sm:text-base lg:text-xl py-2 sm:py-3 lg:py-4 px-1">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={`week-${weekIndex}`}>
                  {week.map((dayValue, dayIndex) => {
                    let content = null;
                    
                    if (typeof dayValue === 'string') {
                      // Previous/next month days
                      const dayNum = parseInt(dayValue.split('-')[1]);
                      content = (
                        <div className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center rounded-md font-semibold text-sm sm:text-lg lg:text-3xl bg-gray-100 text-gray-400 cursor-default mx-auto">
                          {dayNum}
                        </div>
                      );
                    } else if (typeof dayValue === 'number') {
                      // Current month days
                      const shiftName = dateShiftMap.get(dayValue) || 'off';
                      const bgColor = getShiftColor(shiftName);
                      content = (
                        <div
                          className={`w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center rounded-md font-semibold text-white text-sm sm:text-lg lg:text-3xl cursor-pointer hover:shadow-xl transition-shadow mx-auto ${bgColor}`}
                          title={shiftName}
                        >
                          {dayValue}
                        </div>
                      );
                    }

                    return (
                      <td key={`${weekIndex}-${dayIndex}`} className="text-center py-1 sm:py-2 lg:py-3 px-0.5 sm:px-1">
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Print Button */}
      <div className="flex justify-end mb-4 px-2">
        <button 
          onClick={onPrint}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-gray-100 rounded-md transition-colors font-medium text-gray-900 shadow-md border border-gray-200 text-sm sm:text-base"
        >
          <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Print View</span>
        </button>
      </div>

      {/* Calendar */}
      {renderCalendar()}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 sm:gap-8 lg:gap-16 mt-6 sm:mt-8 flex-wrap px-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded" />
          <span className="text-xs sm:text-sm font-medium text-black">Morning</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded" />
          <span className="text-xs sm:text-sm font-medium text-black">Afternoon</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded" />
          <span className="text-xs sm:text-sm font-medium text-black">Night</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded" />
          <span className="text-xs sm:text-sm font-medium text-black">Off</span>
        </div>
      </div>
    </>
  );
};

export default RosterCalendarView;

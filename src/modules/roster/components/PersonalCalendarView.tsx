/**
 * PersonalCalendarView Component
 * 
 * Monthly calendar for personal schedule (employee's own shifts only)
 * Optimized with dedicated backend endpoint
 */

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { personalScheduleService, type PersonalScheduleDay } from '../repository/personalScheduleService';
import { toast } from 'react-toastify';

interface PersonalCalendarViewProps {
  initialMonth?: number;
  initialYear?: number;
  rosterId?: number; // Optional: Load schedule by specific roster ID
}

const PersonalCalendarView: React.FC<PersonalCalendarViewProps> = ({
  initialMonth = new Date().getMonth() + 1,
  initialYear = new Date().getFullYear(),
  rosterId
}) => {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [schedule, setSchedule] = useState<PersonalScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState('');
  const [rosterStatus, setRosterStatus] = useState<string>('');

  useEffect(() => {
    loadSchedule();
  }, [month, year, rosterId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      
      // If rosterId is provided, use that endpoint, otherwise use month/year
      const response = rosterId 
        ? await personalScheduleService.getMyScheduleByRoster(rosterId)
        : await personalScheduleService.getMySchedule(month, year);
        
      setSchedule(response.data.schedule);
      setEmployeeName(response.data.employee.name);
      setRosterStatus(response.data.status || '');
      
      // Update month/year from response if using rosterId
      if (rosterId && response.data.month && response.data.year) {
        setMonth(response.data.month);
        setYear(response.data.year);
      }
    } catch (error: any) {
      console.error('Failed to load schedule:', error);
      if (error.response?.status === 404) {
        toast.info('No published roster for this period');
        setSchedule([]);
      } else {
        toast.error('Failed to load your schedule');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (m: number) => {
    return new Date(0, m - 1).toLocaleString('default', { month: 'long' });
  };

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m, 0).getDate();
  };

  const getFirstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m - 1, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const getShiftColor = (shiftName: string): string => {
    const name = shiftName.toLowerCase();
    if (name.includes('morning') || name.includes('pagi') || name.includes('1')) return 'bg-blue-500';
    if (name.includes('afternoon') || name.includes('siang') || name.includes('2')) return 'bg-yellow-400';
    if (name.includes('night') || name.includes('malam') || name.includes('3')) return 'bg-green-500';
    return 'bg-red-500';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (month === 1) {
        setMonth(12);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    } else {
      if (month === 12) {
        setMonth(1);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    // Create date-to-shift map
    const dateShiftMap = new Map<number, string>();
    schedule.forEach(day => {
      const date = new Date(day.date);
      const dayOfMonth = date.getDate();
      dateShiftMap.set(dayOfMonth, day.shift_name);
    });

    // Calculate previous month days
    const prevMonthDays = getDaysInMonth(year, month === 1 ? 12 : month - 1);
    const prevMonthEmptyDays = Array.from(
      { length: firstDay },
      (_, i) => prevMonthDays - firstDay + i + 1
    );

    // Build weeks
    const weeks: (number | string)[][] = [];
    let currentWeek: (number | string)[] = [];
    
    prevMonthEmptyDays.forEach(day => {
      currentWeek.push(`prev-${day}`);
    });
    
    for (let day = 1; day <= daysInMonth; day++) {
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
      currentWeek.push(day);
    }
    
    let nextMonthDay = 1;
    while (currentWeek.length < 7) {
      currentWeek.push(`next-${nextMonthDay}`);
      nextMonthDay++;
    }
    weeks.push(currentWeek);

    return (
      <div className="rounded-3xl p-4 sm:p-6 lg:p-10 shadow-lg border border-gray-100" style={{ backgroundColor: '#222E6A' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 lg:mb-10">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              {getMonthName(month)} {year}
            </h2>
            <p className="text-white/80 text-sm mt-1">
              {employeeName}
              {rosterStatus && (
                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                  rosterStatus === 'published' ? 'bg-green-500/30' : 'bg-yellow-500/30'
                }`}>
                  {rosterStatus}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-center font-semibold text-white text-xs py-2 px-1 sm:py-4 sm:px-3 w-8 sm:w-12"></th>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                  <th key={day} className="text-center font-semibold text-white text-xs sm:text-sm py-2 px-1 sm:py-4 sm:px-3">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={`week-${weekIndex}`}>
                  <td className="text-center py-2 px-1 sm:py-5 sm:px-3">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg font-bold text-white text-xs sm:text-sm" style={{ backgroundColor: '#454D7C' }}>
                      {weekIndex + 1}
                    </div>
                  </td>
                  {week.map((dayValue, dayIndex) => {
                    let content = null;

                    if (typeof dayValue === 'string') {
                      const dayNum = parseInt(dayValue.split('-')[1]);
                      content = (
                        <div className="w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center rounded-lg font-bold text-xs sm:text-base bg-gray-100 text-gray-400 cursor-default mx-auto">
                          {dayNum}
                        </div>
                      );
                    } else if (typeof dayValue === 'number') {
                      const shiftName = dateShiftMap.get(dayValue) || 'off';
                      const bgColor = getShiftColor(shiftName);
                      const isToday = dayValue === new Date().getDate() && 
                                     month === new Date().getMonth() + 1 && 
                                     year === new Date().getFullYear();
                      
                      content = (
                        <div
                          className={`w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center rounded-lg font-bold text-white text-xs sm:text-base cursor-default mx-auto ${bgColor} ${
                            isToday ? 'ring-4 ring-white ring-opacity-50' : ''
                          }`}
                          title={`${dayValue} ${getMonthName(month)} - ${shiftName}`}
                        >
                          {dayValue}
                        </div>
                      );
                    }

                    return (
                      <td key={`${weekIndex}-${dayIndex}`} className="text-center py-2 px-1 sm:py-5 sm:px-3">
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#222E6A]"></div>
      </div>
    );
  }

  return (
    <>
      {renderCalendar()}

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 sm:gap-16 mt-8 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded" />
          <span className="text-sm font-medium text-black">Morning/Shift 1</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-yellow-400 rounded" />
          <span className="text-sm font-medium text-black">Afternoon/Shift 2</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-green-500 rounded" />
          <span className="text-sm font-medium text-black">Night/Shift 3</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-red-500 rounded" />
          <span className="text-sm font-medium text-black">Off</span>
        </div>
      </div>
    </>
  );
};

export default PersonalCalendarView;

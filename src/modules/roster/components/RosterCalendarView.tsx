/**
 * RosterCalendarView Component
 * 
 * Monthly calendar grid for roster visualization
 * Shows shifts for each day with color coding
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import type { RosterPeriod, Shift } from '../types/roster';
import { shiftRequestService, type ShiftRequestItem } from '../repository/shiftRequestService';

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
  const [completedSwaps, setCompletedSwaps] = useState<ShiftRequestItem[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadCompletedSwaps = async () => {
      if (!currentEmployeeId) {
        if (mounted) {
          setCompletedSwaps([]);
        }
        return;
      }

      try {
        const response = await shiftRequestService.getShiftRequests({
          status: 'completed',
          per_page: 300,
          page: 1,
          roster_period_id: roster.id,
        });

        if (!mounted) return;

        const myCompleted = (response.data || []).filter((request) =>
          request.requester_employee_id === currentEmployeeId || request.target_employee_id === currentEmployeeId
        );
        setCompletedSwaps(myCompleted);
      } catch (error) {
        console.error('Failed to load completed swap overlays for calendar:', error);
        if (mounted) {
          setCompletedSwaps([]);
        }
      }
    };

    loadCompletedSwaps();

    const intervalId = window.setInterval(() => {
      loadCompletedSwaps();
    }, 8000);

    const onFocus = () => loadCompletedSwaps();
    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadCompletedSwaps();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [currentEmployeeId, roster.id]);

  const completedSwapNoteByDate = useMemo(() => {
    if (!currentEmployeeId) return new Map<string, string>();

    const toDateKey = (value: string | undefined | null) => {
      if (!value) return '';
      return value.split('T')[0];
    };

    const swapsByDate = new Map<string, { note: string; order: number }>();

    completedSwaps.forEach((request) => {
      const requestDate = toDateKey(request.from_roster_day?.work_date || request.to_roster_day?.work_date);
      if (!requestDate) return;

      const nextNote = request.requester_employee_id === currentEmployeeId
        ? request.target_notes
        : request.requester_notes;

      const order = new Date(
        request.swap_executed_at || request.updated_at || request.created_at
      ).getTime();

      const existing = swapsByDate.get(requestDate);
      if (!existing || order >= existing.order) {
        swapsByDate.set(requestDate, {
          note: nextNote,
          order,
        });
      }
    });

    const noteMap = new Map<string, string>();
    swapsByDate.forEach((value, date) => {
      noteMap.set(date, value.note);
    });

    return noteMap;
  }, [completedSwaps, currentEmployeeId]);

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

  /**
   * Get shift type from notes or shift name - same logic as RosteredStaffPersonView
   */
  const getShiftType = (notes: string | undefined, shiftName: string | undefined): string => {
    // Prioritize notes field first (same as personView)
    const note = (notes || '').toLowerCase().trim();
    const name = (shiftName || '').toLowerCase().trim();
    
    // Check notes first
    if (note) {
      // Regular shifts
      if (note === 'pagi' || note === 'p') return 'pagi';
      if (note === 'siang' || note === 's') return 'siang';
      if (note === 'malam' || note === 'm') return 'malam';
      
      // Libur/Off status
      if (note === 'l' || note === 'libur' || note === 'off') return 'libur';
      if (note === 'l1' || note === 'l2' || note === 'libur1' || note === 'libur2') return 'libur';
      
      // Cuti types
      if (note === 'ct' || note === 'cuti tahunan' || note.includes('cuti tahunan')) return 'cuti';
      if (note === 'cs' || note === 'cuti sakit' || note === 'cuti dokter' || note.includes('cuti sakit') || note.includes('cuti dokter')) return 'sakit';
      if (note.includes('cuti') || note.includes('leave')) return 'cuti';
      
      // Special status
      if (note === 'oh' || note === 'office hour' || note.includes('office hour')) return 'oh';
      if (note === 'dl' || note === 'dinas luar' || note.includes('dinas luar')) return 'dl';
      if (note === 'tb' || note === 'tugas belajar' || note.includes('tugas belajar')) return 'tb';
      if (note === '-' || note === 'lepas malam' || note === 'lepas dinas malam' || note.includes('lepas')) return 'lepas';
      if (note === 'sc' || note === 'standby on call' || note === 'stby' || note.includes('standby')) return 'standby';
      if (note === 's/p' || note === 'standby pagi') return 'standby';
      if (note === 's/s' || note === 'standby siang') return 'standby';
      if (note === 's/m' || note === 'standby malam') return 'standby';
      if (note.includes('sakit') || note.includes('sick')) return 'sakit';
      if (note.includes('training') || note.includes('pelatihan')) return 'training';
      
      // Partial matches for regular shifts
      if (note.includes('pagi')) return 'pagi';
      if (note.includes('siang')) return 'siang';
      if (note.includes('malam')) return 'malam';
    }
    
    // Fallback to shift name
    if (name) {
      if (name.includes('morning') || name.includes('pagi') || name.includes('shift 1') || name === 'pagi') return 'pagi';
      if (name.includes('afternoon') || name.includes('siang') || name.includes('shift 2') || name === 'siang') return 'siang';
      if (name.includes('night') || name.includes('malam') || name.includes('shift 3') || name === 'malam') return 'malam';
      if (name.includes('libur') || name.includes('off') || name === 'l' || name === 'l1' || name === 'l2') return 'libur';
    }
    
    return 'unknown';
  };

  /**
   * Get CSS color class based on shift type - same colors as RosteredStaffPersonView
   */
  const getShiftColor = (shiftType: string): string => {
    switch (shiftType) {
      case 'pagi': return 'bg-blue-500';
      case 'siang': return 'bg-orange-500';
      case 'malam': return 'bg-emerald-600';
      case 'libur': return 'bg-red-500';
      default: return 'bg-yellow-400';
    }
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

    // Create map of dates to shift types
    const dateShiftMap = new Map<number, string>();
    roster.roster_days?.forEach(day => {
      const dateObj = new Date(day.work_date);
      const dayOfMonth = dateObj.getDate();
      const dayKey = (day.work_date || '').split('T')[0];

      const overlayNote = completedSwapNoteByDate.get(dayKey);
      if (overlayNote) {
        const overlayShiftType = getShiftType(overlayNote, undefined);
        dateShiftMap.set(dayOfMonth, overlayShiftType);
        return;
      }
      
      // Filter assignments by current employee if provided
      let assignments = day.shift_assignments || [];
      if (currentEmployeeId) {
        assignments = assignments.filter(a => a.employee_id === currentEmployeeId);
      }
      
      // Get shift type using same logic as RosteredStaffPersonView
      if (assignments.length > 0) {
        const assignment = assignments[0];
        const shiftType = getShiftType(assignment.notes ?? undefined, assignment.shift?.name);
        dateShiftMap.set(dayOfMonth, shiftType);
      } else {
        dateShiftMap.set(dayOfMonth, 'libur'); // No assignment = off
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
      <div className="rounded-2xl sm:rounded-3xl p-3 sm:p-6 lg:p-8 shadow-lg border border-gray-100 -mx-4 sm:mx-0" style={{ backgroundColor: '#222E6A' }}>
        {/* Header */}
        <div className="flex items-center justify-center mb-4 sm:mb-8 lg:mb-12">
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white">
            {getMonthName(roster.month)}
          </h2>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
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
                      const shiftType = dateShiftMap.get(dayValue) || 'libur';
                      const bgColor = getShiftColor(shiftType);
                      content = (
                        <div
                          className={`w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 flex items-center justify-center rounded-md font-semibold text-white text-sm sm:text-lg lg:text-3xl cursor-pointer hover:shadow-xl transition-shadow mx-auto ${bgColor}`}
                          title={shiftType}
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
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 8mm;
          }

          .roster-calendar-print-wrapper thead {
            display: table-header-group !important;
          }

          .roster-calendar-print-wrapper tfoot {
            display: table-row-group !important;
          }

          .print-hidden {
            display: none !important;
          }

          .roster-calendar-print-wrapper {
            width: 100% !important;
          }
        }
      `}</style>

      {/* Print Button */}
      <div className="print-hidden flex justify-end mb-4 -mx-4 sm:mx-0 pr-0 sm:pr-0">
        <button 
          onClick={onPrint}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-gray-100 rounded-xl transition-colors font-medium text-gray-900 shadow-md border border-gray-200 text-sm sm:text-base"
        >
          <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Print View</span>
        </button>
      </div>

      {/* Calendar */}
      <div className="roster-calendar-print-wrapper">
        {renderCalendar()}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 lg:gap-16 mt-6 sm:mt-8 flex-wrap px-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded" />
            <span className="text-xs sm:text-sm font-medium text-black">Pagi</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded" />
            <span className="text-xs sm:text-sm font-medium text-black">Siang</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-emerald-600 rounded" />
            <span className="text-xs sm:text-sm font-medium text-black">Malam</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded" />
            <span className="text-xs sm:text-sm font-medium text-black">Libur</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded" />
            <span className="text-xs sm:text-sm font-medium text-black">Cuti/Penugasan Lain</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default RosterCalendarView;

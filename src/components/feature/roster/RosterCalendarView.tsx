/**
 * RosterCalendarView Component
 * 
 * Monthly calendar grid for roster visualization
 * Shows shifts for each day with color coding
 */

import React from 'react';
import { Printer } from 'lucide-react';

// Types matching backend API
interface RosterDay {
  id: number;
  work_date: string;
  shift_assignments?: ShiftAssignment[];
}

interface ShiftAssignment {
  id: number;
  shift_id: number | null;
  employee_id?: number;
  notes: string;
  shift?: {
    id: number;
    name: string;
  } | null;
}

interface RosterPeriod {
  id: number;
  month: number;
  year: number;
  roster_days?: RosterDay[];
}

interface Shift {
  id: number;
  name: string;
}

interface RosterCalendarViewProps {
  roster: RosterPeriod;
  shifts: Shift[];
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
      
      // Filter assignments by current employee if provided
      let assignments = day.shift_assignments || [];
      if (currentEmployeeId) {
        assignments = assignments.filter(a => a.employee_id === currentEmployeeId);
      }
      
      // Get shift type using same logic as RosteredStaffPersonView
      if (assignments.length > 0) {
        const assignment = assignments[0];
        const shiftType = getShiftType(assignment.notes, assignment.shift?.name);
        dateShiftMap.set(dayOfMonth, shiftType);
      } else {
        dateShiftMap.set(dayOfMonth, 'libur'); // No assignment = off
      }
    });

    const weeks: (number | string)[][] = [];
    let currentWeek: (number | string)[] = [];
    
    prevMonthEmptyDays.forEach(day => {
      currentWeek.push(`prev-${day}`);
    });
    
    for (const day of daysArray) {
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
        <div className="flex items-center justify-center mb-6 sm:mb-8 lg:mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            {getMonthName(roster.month)}
          </h2>
        </div>

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
                      const shiftType = dateShiftMap.get(dayValue) || 'libur';
                      const bgColor = getShiftColor(shiftType);
                      content = (
                        <div
                          className={`w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center rounded-lg font-bold text-white text-xs sm:text-base cursor-pointer hover:shadow-xl transition-shadow mx-auto ${bgColor}`}
                          title={shiftType}
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

  return (
    <>
      <div className="flex justify-end mb-4">
        <button 
          onClick={onPrint}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-900 shadow-md border border-gray-200"
        >
          <Printer className="h-5 w-5" />
          <span>Print View</span>
        </button>
      </div>

      {renderCalendar()}

      <div className="flex items-center justify-center gap-8 sm:gap-16 mt-8 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded" />
          <span className="text-sm font-medium text-black">Pagi</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-orange-500 rounded" />
          <span className="text-sm font-medium text-black">Siang</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-emerald-600 rounded" />
          <span className="text-sm font-medium text-black">Malam</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-red-500 rounded" />
          <span className="text-sm font-medium text-black">Libur</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-yellow-400 rounded" />
          <span className="text-sm font-medium text-black">Cuti/Penugasan Lain</span>
        </div>
      </div>
    </>
  );
};

export default RosterCalendarView;

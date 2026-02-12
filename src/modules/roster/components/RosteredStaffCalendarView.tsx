/**
 * RosteredStaffCalendarView Component
 * 
 * Weekly-based roster grid per shift with staff assignments
 * Improved UX: Shows one week at a time for better readability
 * Shows staff names in day cells with shift-based colors
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RosterPeriod, Shift, Employee } from '../types/roster';

interface RosteredStaffCalendarViewProps {
  roster: RosterPeriod;
  shifts: Shift[];
}

type ShiftEmployeeRow = {
  employee: Employee;
  days: Set<number>;
};

const RosteredStaffCalendarView: React.FC<RosteredStaffCalendarViewProps> = ({
  roster,
  shifts
}) => {
  const [currentWeek, setCurrentWeek] = useState(0);

  const getMonthName = (month: number) => {
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getShiftClasses = (shiftName: string) => {
    const name = shiftName.toLowerCase();
    if (name.includes('morning') || name.includes('pagi')) return 'bg-blue-600 text-white';
    if (name.includes('afternoon') || name.includes('siang')) return 'bg-yellow-400 text-gray-900';
    if (name.includes('night') || name.includes('malam')) return 'bg-green-500 text-white';
    return 'bg-purple-500 text-white';
  };

  const getFirstName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    return parts[0] || fullName;
  };

  const daysInMonth = getDaysInMonth(roster.year, roster.month);
  
  // Split days into weeks (7 days each)
  const weeks: number[][] = [];
  let currentWeekDays: number[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeekDays.push(day);
    if (currentWeekDays.length === 7 || day === daysInMonth) {
      weeks.push([...currentWeekDays]);
      currentWeekDays = [];
    }
  }

  const totalWeeks = weeks.length;
  const displayedDays = weeks[currentWeek] || [];

  const getShiftEmployeeRows = (shiftId: number, daysToShow: number[]): ShiftEmployeeRow[] => {
    const employeeMap = new Map<number, ShiftEmployeeRow>();

    roster.roster_days?.forEach((day) => {
      const dayNumber = new Date(day.work_date).getDate();
      if (!daysToShow.includes(dayNumber)) return;
      
      day.shift_assignments?.forEach((assignment) => {
        if (assignment.shift_id !== shiftId) return;
        const existing = employeeMap.get(assignment.employee_id);
        if (existing) {
          existing.days.add(dayNumber);
        } else {
          employeeMap.set(assignment.employee_id, {
            employee: assignment.employee,
            days: new Set([dayNumber])
          });
        }
      });
    });

    return Array.from(employeeMap.values()).sort((a, b) =>
      a.employee.user.name.localeCompare(b.employee.user.name)
    );
  };

  const handlePrevWeek = () => {
    if (currentWeek > 0) setCurrentWeek(currentWeek - 1);
  };

  const handleNextWeek = () => {
    if (currentWeek < totalWeeks - 1) setCurrentWeek(currentWeek + 1);
  };

  const getWeekDateRange = () => {
    const firstDay = displayedDays[0];
    const lastDay = displayedDays[displayedDays.length - 1];
    return `${firstDay} - ${lastDay} ${getMonthName(roster.month)}`;
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 -mx-7 sm:mx-0 p-4 sm:p-6 lg:p-8">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-6 gap-2">
        <button
          onClick={handlePrevWeek}
          disabled={currentWeek === 0}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
            currentWeek === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="text-center flex-1 min-w-0">
          <h2 className="text-lg sm:text-3xl font-bold text-gray-900">Work Schedule</h2>
          <p className="text-sm sm:text-lg text-gray-700 truncate">
            {getWeekDateRange()} {roster.year}
          </p>
          <p className="text-sm sm:text-lg text-gray-400 mt-1">
            Week {currentWeek + 1} of {totalWeeks}
          </p>
        </div>

        <button
          onClick={handleNextWeek}
          disabled={currentWeek === totalWeeks - 1}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
            currentWeek === totalWeeks - 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Week Navigation Pills */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 flex-wrap">
        {weeks.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentWeek(index)}
            className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full text-xs sm:text-lg font-medium transition-all ${
              index === currentWeek
                ? 'bg-[#222E6A] text-white scale-110'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Roster Table */}
      <div className="overflow-x-auto -mx-2 sm:-mx-4 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-2  sm:px-4 py-2 sm:py-3 rounded-tl-md whitespace-nowrap" style={{ backgroundColor: '#222E6A' }}>
                Shift
              </th>
              {displayedDays.map((day) => (
                <th key={day} className="text-center text-[10px] sm:text-xs lg:text-sm font-semibold text-white px-1 sm:px-2 lg:px-3 py-2 sm:py-3" style={{ backgroundColor: '#222E6A' }}>
                  <div className="font-bold">{day}</div>
                </th>
              ))}
              <th className="w-6 sm:w-12 rounded-tr-xl" style={{ backgroundColor: '#222E6A' }}></th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift, shiftIndex) => {
              const employeeRows = getShiftEmployeeRows(shift.id, displayedDays);
              const isLastShift = shiftIndex === shifts.length - 1;
              
              const shiftLabel = (
                <div className="text-left">
                  <div className="text-[10px] sm:text-xs lg:text-sm font-semibold whitespace-nowrap">{shift.shift_name}</div>
                  <div className="text-[9px] sm:text-[10px] text-white/70">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</div>
                </div>
              );

              if (employeeRows.length === 0) {
                return (
                  <tr key={shift.id}>
                    <td className={`text-white px-2 sm:px-4 py-2 sm:py-4 ${isLastShift ? 'rounded-bl-xl' : ''}`} style={{ backgroundColor: '#454D7C' }}>
                      {shiftLabel}
                    </td>
                    {displayedDays.map((day) => (
                      <td key={`${shift.id}-${day}`} className="p-1 sm:p-2 border-b border-gray-100">
                        <div className="h-7 sm:h-10 w-8 sm:w-14 rounded-lg bg-gray-50 mx-auto" />
                      </td>
                    ))}
                    <td className={`border-b border-gray-100 ${isLastShift ? 'rounded-br-xl' : ''}`}></td>
                  </tr>
                );
              }

              return employeeRows.map((row, rowIndex) => {
                const isLastRow = rowIndex === employeeRows.length - 1;
                return (
                  <tr key={`${shift.id}-${row.employee.id}`} className="hover:bg-gray-50 transition-colors">
                    {rowIndex === 0 && (
                      <td 
                        rowSpan={employeeRows.length} 
                        className={`text-white px-2 sm:px-4 py-2 sm:py-4 align-top ${isLastShift ? 'rounded-bl-xl' : ''}`} 
                        style={{ backgroundColor: '#454D7C' }}
                      >
                        {shiftLabel}
                      </td>
                    )}
                    {displayedDays.map((day) => {
                      const isAssigned = row.days.has(day);
                      return (
                        <td key={`${shift.id}-${row.employee.id}-${day}`} className={`p-1 sm:p-2 ${isLastRow && isLastShift ? 'border-none' : 'border-b border-gray-100'}`}>
                          <div
                            className={`h-7 sm:h-10 w-8 sm:w-14 rounded-lg flex items-center justify-center text-[9px] sm:text-xs lg:text-sm font-semibold mx-auto transition-all hover:scale-105 cursor-pointer ${
                              isAssigned ? getShiftClasses(shift.shift_name) + ' shadow-md' : 'bg-gray-50 text-gray-300'
                            }`}
                            title={isAssigned ? row.employee.user.name : 'Not assigned'}
                          >
                            {isAssigned ? getFirstName(row.employee.user.name) : '-'}
                          </div>
                        </td>
                      );
                    })}
                    <td className={`${isLastRow && isLastShift ? 'rounded-br-xl border-none' : 'border-b border-gray-100'}`}></td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 mt-8 flex-wrap">
        {shifts.map((shift) => (
          <div key={`legend-${shift.id}`} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded ${getShiftClasses(shift.shift_name)} shadow-sm`} />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-800">{shift.shift_name}</div>
              <div className="text-xs text-gray-500">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RosteredStaffCalendarView;

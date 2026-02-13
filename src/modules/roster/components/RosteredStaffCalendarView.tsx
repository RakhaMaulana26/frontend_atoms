/**
 * RosteredStaffCalendarView Component
 * 
 * Compact weekly-based roster grid showing all staff per shift in single cells
 * Shows one week at a time for better readability
 * Displays multiple staff names stacked in each day cell
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RosterPeriod, Shift, ShiftAssignment } from '../types/roster';

interface RosteredStaffCalendarViewProps {
  roster: RosterPeriod;
  shifts: Shift[];
}

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

  const getDayName = (year: number, month: number, day: number): string => {
    const date = new Date(year, month - 1, day);
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return dayNames[date.getDay()];
  };

  const getShiftClasses = (shiftName: string) => {
    const name = shiftName.toLowerCase();
    if (name.includes('morning') || name.includes('pagi')) return 'bg-blue-500 text-white';
    if (name.includes('afternoon') || name.includes('siang')) return 'bg-orange-500 text-white';
    if (name.includes('night') || name.includes('malam')) return 'bg-emerald-600 text-white';
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

  // Get all assignments for a specific shift on a specific day
  const getAssignmentsForShiftDay = (shiftId: number, dayNumber: number): ShiftAssignment[] => {
    const dateStr = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const rosterDay = roster.roster_days?.find(d => d.work_date === dateStr);
    
    if (!rosterDay) return [];
    
    const assignments = rosterDay.shift_assignments
      ?.filter(assignment => assignment.shift_id === shiftId)
      .sort((a, b) => a.employee.user.name.localeCompare(b.employee.user.name)) || [];
    
    return assignments;
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
                  <div className="text-[9px] sm:text-[10px] text-white/70">{getDayName(roster.year, roster.month, day)}</div>
                  <div className="font-bold">{day}</div>
                </th>
              ))}
              <th className="w-6 sm:w-12 rounded-tr-xl" style={{ backgroundColor: '#222E6A' }}></th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift, shiftIndex) => {
              const isLastShift = shiftIndex === shifts.length - 1;
              
              return (
                <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                  <td 
                    className={`text-white px-2 sm:px-4 py-3 sm:py-4 align-top ${isLastShift ? 'rounded-bl-xl' : ''}`} 
                    style={{ backgroundColor: '#454D7C' }}
                  >
                    <div className="text-left">
                      <div className="text-[10px] sm:text-xs lg:text-sm font-semibold whitespace-nowrap">{shift.name}</div>
                      <div className="text-[9px] sm:text-[10px] text-white/70">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</div>
                    </div>
                  </td>
                  {displayedDays.map((day) => {
                    const assignments = getAssignmentsForShiftDay(shift.id, day);
                    const hasAssignments = assignments.length > 0;
                    
                    return (
                      <td 
                        key={`${shift.id}-${day}`} 
                        className={`p-1 sm:p-2 align-top ${isLastShift ? 'border-none' : 'border-b border-gray-100'}`}
                      >
                        {hasAssignments ? (
                          <div className="flex flex-col gap-1">
                            {assignments.map((assignment) => {
                              const displayText = getFirstName(assignment.employee.user.name);
                              const tooltipText = assignment.notes 
                                ? `${assignment.employee.user.name} - ${assignment.notes}`
                                : assignment.employee.user.name;
                              
                              return (
                                <div
                                  key={assignment.id}
                                  className={`px-2 py-1 rounded-md text-[9px] sm:text-xs font-semibold text-center transition-all hover:scale-105 cursor-pointer shadow-sm ${getShiftClasses(shift.name)}`}
                                  title={tooltipText}
                                >
                                  {displayText}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-8 sm:h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 text-xs">
                            -
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className={`${isLastShift ? 'rounded-br-xl border-none' : 'border-b border-gray-100'}`}></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 sm:gap-8 mt-8 flex-wrap">
        {shifts.map((shift) => (
          <div key={`legend-${shift.id}`} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${getShiftClasses(shift.name)} shadow-sm flex items-center justify-center text-xs font-bold`}>
              {shift.name.includes('pagi') || shift.name.includes('Pagi') || shift.name.includes('Morning') ? 'P' : 
               shift.name.includes('siang') || shift.name.includes('Siang') || shift.name.includes('Afternoon') ? 'S' : 
               shift.name.includes('malam') || shift.name.includes('Malam') || shift.name.includes('Night') ? 'M' : '-'}
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-medium text-gray-800">{shift.name}</div>
              <div className="text-[10px] sm:text-xs text-gray-500">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RosteredStaffCalendarView;

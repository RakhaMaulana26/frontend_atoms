/**
 * RosteredStaffPersonView Component
 * 
 * Shows roster in a person-by-person format
 * Each row represents one employee with all their shift assignments for the month
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RosterPeriod, Shift, Employee, ShiftAssignment } from '../types/roster';

interface RosteredStaffPersonViewProps {
  roster: RosterPeriod;
  shifts: Shift[];
}

type EmployeeRosterRow = {
  employee: Employee;
  assignmentsByDay: Map<number, ShiftAssignment>; // day number -> assignment
};

const RosteredStaffPersonView: React.FC<RosteredStaffPersonViewProps> = ({
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
    if (name.includes('morning') || name.includes('pagi') || name.includes('shift 1')) return 'bg-blue-500 text-white font-semibold';
    if (name.includes('afternoon') || name.includes('siang') || name.includes('shift 2')) return 'bg-orange-500 text-white font-semibold';
    if (name.includes('night') || name.includes('malam') || name.includes('shift 3')) return 'bg-emerald-600 text-white font-semibold';
    return 'bg-gray-600 text-white font-semibold';
  };

  const getNotesClasses = (notes: string) => {
    const note = notes.toLowerCase().trim();
    
    // Shift reguler dengan warna kontras tinggi
    if (note === 'pagi' || note === 'p') return 'bg-blue-500 text-white font-semibold';
    if (note === 'siang' || note === 's') return 'bg-orange-500 text-white font-semibold';
    if (note === 'malam' || note === 'm') return 'bg-emerald-600 text-white font-semibold';
    
    // Status karyawan dengan warna yang lebih kontras dan mudah dibedakan
    if (note === 'l' || note === 'libur' || note === 'off') return 'bg-slate-400 text-white font-semibold';
    if (note === 'ct' || note === 'cuti tahunan') return 'bg-amber-400 text-gray-900 font-semibold';
    if (note === 'cs' || note === 'cuti sakit' || note === 'cuti dokter') return 'bg-rose-500 text-white font-semibold';
    if (note === 'oh' || note === 'office hour') return 'bg-cyan-500 text-white font-semibold';
    if (note === 'dl' || note === 'dinas luar') return 'bg-teal-500 text-white font-semibold';
    if (note === 'tb' || note === 'tugas belajar') return 'bg-indigo-500 text-white font-semibold';
    if (note === '-' || note === 'lepas malam' || note === 'lepas dinas malam') return 'bg-gray-600 text-white font-semibold';
    if (note === 'sc' || note === 'standby on call' || note === 'stby') return 'bg-purple-500 text-white font-semibold';
    if (note === 's/p' || note === 'standby pagi') return 'bg-violet-500 text-white font-semibold';
    if (note === 's/s' || note === 'standby siang') return 'bg-fuchsia-500 text-white font-semibold';
    if (note === 's/m' || note === 'standby malam') return 'bg-pink-500 text-white font-semibold';
    
    // Partial matches - Gunakan warna yang sama dengan exact match
    if (note.includes('pagi')) return 'bg-blue-500 text-white font-semibold';
    if (note.includes('siang')) return 'bg-orange-500 text-white font-semibold';
    if (note.includes('malam')) return 'bg-emerald-600 text-white font-semibold';
    if (note.includes('cuti tahunan')) return 'bg-amber-400 text-gray-900 font-semibold';
    if (note.includes('cuti sakit') || note.includes('cuti dokter')) return 'bg-rose-500 text-white font-semibold';
    if (note.includes('office hour')) return 'bg-cyan-500 text-white font-semibold';
    if (note.includes('standby')) return 'bg-purple-500 text-white font-semibold';
    if (note.includes('dinas luar')) return 'bg-teal-500 text-white font-semibold';
    if (note.includes('lepas')) return 'bg-gray-600 text-white font-semibold';
    if (note.includes('tugas belajar')) return 'bg-indigo-500 text-white font-semibold';
    if (note.includes('cuti') || note.includes('leave')) return 'bg-yellow-500 text-gray-900 font-semibold';
    if (note.includes('training') || note.includes('pelatihan')) return 'bg-sky-500 text-white font-semibold';
    if (note.includes('sakit') || note.includes('sick')) return 'bg-red-500 text-white font-semibold';
    
    // Default untuk custom notes lainnya - Warna yang sangat menonjol
    return 'bg-lime-500 text-gray-900 font-semibold';
  };

  const getShiftDisplayText = (shiftName: string): string => {
    const name = shiftName.toLowerCase();
    if (name.includes('morning') || name.includes('pagi') || name.includes('shift 1') || name === 'pagi') return 'Pagi';
    if (name.includes('afternoon') || name.includes('siang') || name.includes('shift 2') || name === 'siang') return 'Siang';
    if (name.includes('night') || name.includes('malam') || name.includes('shift 3') || name === 'malam') return 'Malam';
    // Remove "Shift X -" or "Dinas" prefix and get the first meaningful word
    const cleaned = shiftName.replace(/^(Shift\s+\d+\s*-?\s*|Dinas\s+)/i, '').trim();
    return cleaned.split(' ')[0] || shiftName;
  };

  const cleanNotesText = (notes: string): string => {
    // Remove "Dinas" prefix from notes
    return notes.replace(/^(Dinas\s+)/i, '').trim();
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

  // Get all unique employees from the entire roster period
  const getAllUniqueEmployees = (): Map<number, Employee> => {
    const employeeMap = new Map<number, Employee>();

    roster.roster_days?.forEach((day) => {
      day.shift_assignments?.forEach((assignment) => {
        if (!employeeMap.has(assignment.employee_id)) {
          employeeMap.set(assignment.employee_id, assignment.employee);
        }
      });
    });

    return employeeMap;
  };

  // Get all employees and their assignments organized by day
  const getEmployeeRows = (daysToShow: number[]): EmployeeRosterRow[] => {
    const allEmployees = getAllUniqueEmployees();
    const employeeRowsMap = new Map<number, EmployeeRosterRow>();

    // Initialize all employees with empty assignments
    allEmployees.forEach((employee, employeeId) => {
      employeeRowsMap.set(employeeId, {
        employee,
        assignmentsByDay: new Map<number, ShiftAssignment>()
      });
    });

    // Fill in ALL assignments from entire roster period (not just displayed days)
    roster.roster_days?.forEach((day) => {
      const dayNumber = new Date(day.work_date).getDate();
      
      day.shift_assignments?.forEach((assignment) => {
        const existing = employeeRowsMap.get(assignment.employee_id);
        if (existing) {
          existing.assignmentsByDay.set(dayNumber, assignment);
        }
      });
    });

    return Array.from(employeeRowsMap.values()).sort((a, b) =>
      a.employee.user.name.localeCompare(b.employee.user.name)
    );
  };

  const employeeRows = getEmployeeRows(displayedDays);

  // Group employees by employee_type and group_number from backend
  const allGroupedData = (() => {
    // Separate by employee type
    const typeGroups = new Map<string, Map<number, EmployeeRosterRow[]>>();
    
    employeeRows.forEach(row => {
      const type = row.employee.employee_type;
      const groupNum = row.employee.group_number || 0; // Use 0 for employees without group
      
      if (!typeGroups.has(type)) {
        typeGroups.set(type, new Map());
      }
      
      const groupMap = typeGroups.get(type)!;
      if (!groupMap.has(groupNum)) {
        groupMap.set(groupNum, []);
      }
      
      groupMap.get(groupNum)!.push(row);
    });

    // Convert to array format for rendering
    const result: Array<{ type: string; groups: EmployeeRosterRow[][]; groupNumbers: number[] }> = [];
    
    // Define order: Manager Teknik, CNS, Support
    const typeOrder = ['Manager Teknik', 'CNS', 'Support'];
    
    typeOrder.forEach(orderedType => {
      const groupMap = typeGroups.get(orderedType);
      if (!groupMap) return;
      
      const sortedGroups = Array.from(groupMap.entries())
        .sort((a, b) => a[0] - b[0]) // Sort by group number
        .filter(([groupNum]) => groupNum > 0); // Only show groups with actual group numbers
      
      if (sortedGroups.length > 0) {
        result.push({
          type: orderedType,
          groups: sortedGroups.map(([_, employees]) => employees),
          groupNumbers: sortedGroups.map(([groupNum, _]) => groupNum)
        });
      }
    });

    return result;
  })();

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

  // Get unique Manager Teknik from roster
  const getManagerTeknik = () => {
    const managers = new Set<string>();
    roster.roster_days?.forEach(day => {
      day.manager_duties?.forEach(duty => {
        if (duty.duty_type === 'Manager Teknik') {
          managers.add(duty.employee.user.name);
        }
      });
    });
    return Array.from(managers);
  };

  const managerTeknikList = getManagerTeknik();

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 -mx-4 sm:mx-0 p-4 sm:p-6 lg:p-8">
      {/* Manager Info Box - Top Right */}
      {managerTeknikList.length > 0 && (
        <div className="float-right ml-4 mb-4 p-3 sm:p-4 bg-white border-2 border-black rounded text-center min-w-[150px] sm:min-w-[180px]">
          <div className="text-[10px] sm:text-xs font-bold text-black mb-2">Dibuat,</div>
          <div className="text-[10px] sm:text-xs font-bold text-black uppercase leading-tight mb-3">
            MANAGER TEKNIK {managerTeknikList.length}
          </div>
          <div className="pt-3 border-t-2 border-black">
            {managerTeknikList.map((manager, idx) => (
              <div key={idx} className="text-[10px] sm:text-xs font-bold text-black uppercase mb-1 last:mb-0">
                {manager}
              </div>
            ))}
          </div>
        </div>
      )}

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
          <h2 className="text-lg sm:text-3xl font-bold text-gray-900">Rostered Staff</h2>
          <p className="text-xs sm:text-lg text-gray-500 truncate">
            {getWeekDateRange()} {roster.year}
          </p>
          <p className="text-[10px] sm:text-lg text-gray-400 mt-1">
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
            className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-all ${
              index === currentWeek
                ? 'bg-[#222E6A] text-white scale-110'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Clear float from manager info box */}
      <div className="clear-both"></div>

      {/* Roster Table - Person View */}
      <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-3 sm:px-4 py-2 sm:py-3 rounded-tl-xl whitespace-nowrap sticky left-0 z-10" style={{ backgroundColor: '#222E6A' }}>
                Name
              </th>
              <th className="text-center text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap" style={{ backgroundColor: '#222E6A' }}>
                Kelas
              </th>
              <th className="text-center text-[11px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap" style={{ backgroundColor: '#222E6A' }}>
                Jabatan
              </th>
              {displayedDays.map((day) => (
                <th key={day} className="text-center text-[10px] sm:text-xs lg:text-sm font-semibold text-white px-2 sm:px-3 py-2 sm:py-3" style={{ backgroundColor: '#222E6A' }}>
                  <div className="text-[9px] sm:text-[10px] text-white/70">{getDayName(roster.year, roster.month, day)}</div>
                  <div className="font-bold">{day}</div>
                </th>
              ))}
              <th className="w-6 sm:w-12 rounded-tr-xl" style={{ backgroundColor: '#222E6A' }}></th>
            </tr>
          </thead>
          <tbody>
            {allGroupedData.length === 0 ? (
              <tr>
                <td colSpan={displayedDays.length + 4} className="text-center py-12 text-gray-500">
                  No staff assigned for this week
                </td>
              </tr>
            ) : (
              allGroupedData.map((typeGroup, typeIndex) => (
                <React.Fragment key={`type-${typeGroup.type}`}>
                  {/* Employee Type Header */}
                  <tr>
                    <td 
                      colSpan={displayedDays.length + 4}
                      className="px-3 sm:px-4 py-3 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-[#222E6A] to-[#2a3a7f] border-y-2 border-[#1a235c]"
                    >
                      {typeGroup.type}
                    </td>
                  </tr>
                  
                  {/* Groups within this type */}
                  {typeGroup.groups.map((group, groupIndex) => {
                    const actualGroupNumber = typeGroup.groupNumbers[groupIndex];
                    
                    return (
                      <React.Fragment key={`${typeGroup.type}-${groupIndex}`}>
                        {/* Group Header Row */}
                        <tr>
                          <td 
                            colSpan={displayedDays.length + 4}
                            className="px-3 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-gray-800 bg-gradient-to-r from-orange-200 to-orange-100 border-y border-orange-300"
                          >
                            Grup {actualGroupNumber}
                          </td>
                        </tr>
                      
                      {/* Employee Rows in Group */}
                      {group.map((row, rowIndexInGroup) => {
                        const isLastRowInGroup = rowIndexInGroup === group.length - 1;
                        const isLastGroup = typeIndex === allGroupedData.length - 1 && groupIndex === typeGroup.groups.length - 1;
                        
                        return (
                          <tr key={row.employee.id} className="hover:bg-gray-50 transition-colors">
                            <td className={`px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 sticky left-0 bg-white ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-normal">{rowIndexInGroup + 1}</span>
                                <span className="whitespace-nowrap">{row.employee.user.name}</span>
                              </div>
                            </td>
                            <td className={`px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs lg:text-sm text-gray-700 ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}>
                              {row.employee.user.grade || '-'}
                            </td>
                            <td className={`px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs lg:text-sm text-gray-700 ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}>
                              {row.employee.employee_type}
                            </td>
                            {(() => {
                              const cells: React.ReactElement[] = [];
                              const rendereddDays = new Set<number>();
                              
                              displayedDays.forEach((day) => {
                                // Skip if this day was already covered by a previous merged cell
                                if (rendereddDays.has(day)) {
                                  return;
                                }
                                
                                // Check if this day is a continuation from previous days (outside displayedDays)
                                let actualAssignment = row.assignmentsByDay.get(day);
                                let startDay = day;
                                
                                // If no assignment on this day, check if it's covered by a previous span
                                if (!actualAssignment && day > 1) {
                                  // Look back to find the originating assignment
                                  for (let prevDay = day - 1; prevDay >= 1; prevDay--) {
                                    const prevAssignment = row.assignmentsByDay.get(prevDay);
                                    if (prevAssignment && prevAssignment.span_days) {
                                      // Check if current day is within the span of prevAssignment
                                      if (prevDay + prevAssignment.span_days > day) {
                                        actualAssignment = prevAssignment;
                                        startDay = prevDay;
                                        break;
                                      }
                                    }
                                  }
                                }
                                
                                const assignment = actualAssignment;
                                const shift = assignment ? shifts.find(s => s.id === assignment.shift_id) : null;
                                const hasNotes = assignment?.notes && assignment.notes.trim() !== '';
                                const displayText = hasNotes ? cleanNotesText(assignment.notes!) : (shift ? getShiftDisplayText(shift.name) : '');
                                const tooltipText = hasNotes
                                  ? `${shift?.name || 'Shift'}: ${assignment.notes}` 
                                  : (shift ? `${shift.name}: ${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}` : 'No shift');
                                
                                // Determine cell styling
                                const cellClasses = assignment 
                                  ? (hasNotes 
                                      ? getNotesClasses(assignment.notes!) + ' shadow-sm hover:shadow-md cursor-pointer'
                                      : (shift ? getShiftClasses(shift.name) + ' shadow-sm hover:shadow-md cursor-pointer' : 'bg-gray-100')
                                    )
                                  : 'bg-gray-100';
                                
                                // Get span days from assignment (default to 1)
                                const spanDays = assignment?.span_days || 1;
                                
                                // Calculate how many days from this cell should span within displayedDays
                                // If this is a continuation, count from current day to end of span
                                const spanEndDay = startDay + spanDays - 1;
                                let actualColSpan = 0;
                                
                                for (let d = day; d <= spanEndDay && displayedDays.includes(d); d++) {
                                  actualColSpan++;
                                  rendereddDays.add(d);
                                }
                                
                                // If no colSpan calculated (shouldn't happen), default to 1
                                if (actualColSpan === 0) actualColSpan = 1;
                                
                                cells.push(
                                  <td 
                                    key={`${row.employee.id}-${day}`} 
                                    colSpan={actualColSpan}
                                    className={`px-1 sm:px-2 py-2 sm:py-3 ${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}
                                  >
                                    <div
                                      className={`h-8 sm:h-10 w-full rounded-lg flex items-center justify-center text-[9px] sm:text-xs font-semibold transition-all ${cellClasses}`}
                                      title={tooltipText}
                                    >
                                      {displayText}
                                    </div>
                                  </td>
                                );
                              });
                              
                              return cells;
                            })()}
                            <td className={`${!isLastRowInGroup || !isLastGroup ? 'border-b border-gray-200' : ''}`}></td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legend - Shift Types */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-4 text-center">Keterangan Shift & Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shift Legend */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-emerald-600 rounded"></div>
              Shift Kerja
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-blue-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">
                  Pagi
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">Pagi</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">07:00 - 13:00 / 07:00 - 15:00</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-orange-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">
                  Siang
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">Siang</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">13:00 - 19:00 / 15:00 - 23:00</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-emerald-600 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">
                  Malam
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">Malam</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">19:00 - 07:00 / 23:00 - 07:00</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-red-400 rounded"></div>
              Status Karyawan
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-slate-400 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">L</div>
                <span className="text-gray-700">Libur</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-amber-400 text-gray-900 shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">CT</div>
                <span className="text-gray-700">Cuti Tahunan</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-rose-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">CS</div>
                <span className="text-gray-700">Cuti Sakit / Cuti Dokter</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-teal-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">DL</div>
                <span className="text-gray-700">Dinas Luar</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-cyan-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">OH</div>
                <span className="text-gray-700">Office Hour (08:00 - 17:00)</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-purple-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">SC</div>
                <span className="text-gray-700">Standby On Call</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-gray-600 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">-</div>
                <span className="text-gray-700">Lepas Dinas Malam</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <div className="w-16 h-7 rounded-lg bg-indigo-500 text-white shadow-sm flex items-center justify-center font-semibold text-[10px] sm:text-xs">TB</div>
                <span className="text-gray-700">Tugas Belajar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RosteredStaffPersonView;

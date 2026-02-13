/**
 * ShiftAssignmentCard Component
 * 
 * Reusable card for displaying shift assignments with staff list
 */

import React from 'react';
import type { ShiftAssignment, Shift, ManagerDuty } from '../types/roster';

interface ShiftAssignmentCardProps {
  shift: Shift;
  assignments: ShiftAssignment[];
  managerDuties?: ManagerDuty[];
  backgroundColor: string;
  onAddStaff?: () => void;
  onRemoveStaff?: (assignmentId: number) => void;
  isReadOnly?: boolean;
}

const ShiftAssignmentCard: React.FC<ShiftAssignmentCardProps> = ({
  shift,
  assignments,
  managerDuties = [],
  backgroundColor,
  onAddStaff,
  onRemoveStaff,
  isReadOnly = false
}) => {
  const formatTime = (time: string) => time.substring(0, 5); // "07:00:00" -> "07:00"
  
  // Filter out assignments with null employee or shift
  const validAssignments = assignments.filter(a => a.employee && a.shift);
  
  const cnsCount = validAssignments.filter(a => a.employee.employee_type === 'CNS').length;
  const supportCount = validAssignments.filter(a => a.employee.employee_type === 'Support').length;
  
  // Validation: Need 4 CNS + 2 Support
  const isValid = cnsCount >= 4 && supportCount >= 2;

  // Get user initials or avatar
  const getUserDisplay = (name: string) => {
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return nameParts[0][0] + nameParts[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Sort by role: CNS first, then Support
  const sortedAssignments = [...validAssignments].sort((a, b) => {
    if (a.employee.employee_type === 'CNS' && b.employee.employee_type !== 'CNS') return -1;
    if (a.employee.employee_type !== 'CNS' && b.employee.employee_type === 'CNS') return 1;
    return 0;
  });

  return (
    <div className="border-2 border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden">
      {/* Shift Header */}
      <div className={`${backgroundColor} text-white px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-center`}>
        <div className="text-sm sm:text-base">{shift.shift_name}</div>
        <div className="text-[10px] sm:text-xs font-normal opacity-90 mt-0.5">
          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
        </div>
        
        {/* Validation Status */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2 text-[10px] sm:text-xs">
          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full ${
            isValid 
              ? 'bg-green-500 bg-opacity-30' 
              : 'bg-red-500 bg-opacity-30'
          }`}>
            CNS: {cnsCount}/4
          </span>
          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full ${
            supportCount >= 2 
              ? 'bg-green-500 bg-opacity-30' 
              : 'bg-red-500 bg-opacity-30'
          }`}>
            Support: {supportCount}/2
          </span>
        </div>
      </div>
      
      {/* Staff List */}
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 bg-white">
        {/* Manager Duties for this shift */}
        {managerDuties.length > 0 && (
          <div className="space-y-2 pb-3 border-b border-gray-200">
            {managerDuties.map((duty) => (
              <div key={duty.id} className="flex items-center gap-3 p-2 bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg border border-orange-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {getUserDisplay(duty.employee.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {duty.employee.user.name}
                  </p>
                  <p className="text-xs text-orange-600 truncate">
                    {duty.duty_type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {sortedAssignments.length === 0 ? (
          <div className="text-center text-gray-400 py-3 sm:py-4 text-xs sm:text-sm">
            No staff assigned yet
          </div>
        ) : (
          sortedAssignments.map((assignment) => (
            <div 
              key={assignment.id} 
              className="flex items-center gap-2 sm:gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
            >
              {/* Avatar */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                {getUserDisplay(assignment.employee.user.name)}
              </div>
              
              {/* Employee Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                  {assignment.employee.user.name}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                  {assignment.employee.employee_type}
                </p>
              </div>
              
              {/* Remove Button (if not readonly) */}
              {!isReadOnly && onRemoveStaff && (
                <button
                  onClick={() => onRemoveStaff(assignment.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1"
                  title="Remove staff"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
        
        {/* Add Staff Button (if not readonly) */}
        {!isReadOnly && onAddStaff && (
          <button
            onClick={onAddStaff}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors text-xs sm:text-sm font-medium"
          >
            + Add Staff
          </button>
        )}
      </div>
    </div>
  );
};

export default ShiftAssignmentCard;

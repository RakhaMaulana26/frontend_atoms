/**
 * RosterDetailPage - Refactored with Backend Integration
 * 
 * Features:
 * - Real backend API integration via rosterService
 * - Separated components for better maintainability
 * - Loading and error states
 * - Three views: Calendar, Weekly Staff, Shift Swap Requests
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Users, ArrowRightLeft } from 'lucide-react';
import { PageHeader, ShiftAssignmentCard } from '../../../components';
import { useAuth } from '../../auth/core/AuthContext';
import { useDataCache } from '../../../contexts/DataCacheContext';
import type { RosterDay, Shift } from '../types/roster';
import RosterCalendarView from '../components/RosterCalendarView';
import RosteredStaffCalendarView from '../components/RosteredStaffCalendarView';
import RosteredStaffPersonView from '../components/RosteredStaffPersonView';
import ShiftSwapRequestsTable from '../components/ShiftSwapRequestsTable';
import SwapShiftModal from '../../../components/modals/roster/SwapShiftModal';
import LeaveRequestModal from '../../../components/modals/roster/LeaveRequestModal';

type TabType = 'calendar' | 'staff' | 'swap';
type StaffViewType = 'week' | 'calendar' | 'person';

// Helper function to extract unique shifts from roster data
const extractShiftsFromRoster = (roster: any): Shift[] => {
  if (!roster?.roster_days) return [];
  
  const shiftMap = new Map<number, Shift>();
  
  roster.roster_days.forEach((day: any) => {
    // Extract shifts from shift_assignments
    day.shift_assignments?.forEach((assignment: any) => {
      if (assignment.shift && !shiftMap.has(assignment.shift.id)) {
        shiftMap.set(assignment.shift.id, assignment.shift);
      }
    });
    
    // Extract shifts from manager_duties
    day.manager_duties?.forEach((duty: any) => {
      if (duty.shift && !shiftMap.has(duty.shift.id)) {
        shiftMap.set(duty.shift.id, duty.shift);
      }
    });
  });
  
  const extractedShifts = Array.from(shiftMap.values());
  
  // If no shifts found (new roster), return default shifts for editing
  if (extractedShifts.length === 0) {
    return [
      { id: 1, name: 'pagi', start_time: '07:00:00', end_time: '13:00:00' },
      { id: 2, name: 'siang', start_time: '13:00:00', end_time: '19:00:00' },
      { id: 3, name: 'malam', start_time: '19:00:00', end_time: '07:00:00' },
    ];
  }
  
  return extractedShifts;
};

// Mock swap requests - TODO: Fetch from backend (/shift-swap-requests endpoint)
const mockShiftSwapRequests = [
  {
    id: 1,
    type: 'Swap Request',
    employee: { name: 'Budi', position: 'CNS Technician' },
    originalShift: 'Morning (07:00 - 15:00)',
    requestedShift: 'Night (19:00 - 07:00)',
    submittedDate: '2026-01-18',
    status: 'Approved' as const
  },
  {
    id: 2,
    type: 'Swap Request',
    employee: { name: 'Siti', position: 'CNS Technician' },
    originalShift: 'Afternoon (13:00 - 19:00)',
    requestedShift: 'Morning (07:00 - 15:00)',
    submittedDate: '2026-01-19',
    status: 'Rejected' as const
  },
  {
    id: 3,
    type: 'Overtime Request',
    employee: { name: 'Joko', position: 'Support Technician' },
    originalShift: 'Night (19:00 - 07:00)',
    requestedShift: 'Morning (07:00 - 15:00)',
    submittedDate: '2026-01-20',
    status: 'Pending' as const
  },
  {
    id: 4,
    type: 'Swap Request',
    employee: { name: 'Aldi', position: 'Support Technician' },
    originalShift: 'Night (19:00 - 07:00)',
    requestedShift: 'Morning (07:00 - 15:00)',
    submittedDate: '2026-01-21',
    status: 'Pending' as const
  }
];

// Temporary inline component - will be moved back to separate file after TS cache refresh
const RosterWeekView: React.FC<{
  weekDays: Date[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  rosterDay?: RosterDay;
  shifts: Shift[];
  isReadOnly?: boolean;
  onAddStaff?: (shiftId: number) => void;
  onRemoveStaff?: (assignmentId: number) => void;
  rosterMonth: number;
  rosterYear: number;
}> = ({
  weekDays,
  selectedDate,
  onDateSelect,
  onNavigateWeek,
  rosterDay,
  shifts,
  isReadOnly = false,
  onAddStaff,
  onRemoveStaff,
  rosterMonth,
  rosterYear
}) => {
  const formatDayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' });
  const isSameDay = (d1: Date, d2: Date) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  const isInRosterMonth = (date: Date) => {
    return date.getMonth() === rosterMonth - 1 && date.getFullYear() === rosterYear;
  };
  const getShiftColor = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('morning') || n.includes('pagi')) return 'bg-blue-500';
    if (n.includes('afternoon') || n.includes('siang')) return 'bg-yellow-400';
    if (n.includes('night') || n.includes('malam')) return 'bg-green-500';
    return 'bg-purple-500';
  };
  
  const getMonthName = (month: number) => {
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };
  
  // Check if navigation should be disabled
  const canNavigatePrev = weekDays.some(day => {
    const prevWeekDay = new Date(day);
    prevWeekDay.setDate(day.getDate() - 7);
    return isInRosterMonth(prevWeekDay);
  });
  
  const canNavigateNext = weekDays.some(day => {
    const nextWeekDay = new Date(day);
    nextWeekDay.setDate(day.getDate() + 7);
    return isInRosterMonth(nextWeekDay);
  });

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 -mx-7 sm:mx-0 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <button 
          onClick={() => canNavigatePrev && onNavigateWeek('prev')} 
          disabled={!canNavigatePrev}
          className={`p-2 rounded-lg transition-colors ${
            canNavigatePrev 
              ? 'hover:bg-gray-100 text-gray-900 cursor-pointer' 
              : 'text-gray-300 cursor-not-allowed opacity-50'
          }`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">{getMonthName(rosterMonth)} {rosterYear}</h3>
        <button 
          onClick={() => canNavigateNext && onNavigateWeek('next')} 
          disabled={!canNavigateNext}
          className={`p-2 rounded-lg transition-colors ${
            canNavigateNext 
              ? 'hover:bg-gray-100 text-gray-900 cursor-pointer' 
              : 'text-gray-300 cursor-not-allowed opacity-50'
          }`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
        <div className="grid grid-cols-7 gap-1 min-w-max sm:min-w-0">
        {weekDays.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const isInMonth = isInRosterMonth(day);
          const isDisabled = !isInMonth;
          
          return (
            <button 
              key={idx} 
              onClick={() => !isDisabled && onDateSelect(day)}
              disabled={isDisabled}
              className={`flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 rounded-lg transition-all ${
                isDisabled 
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-40' 
                  : isSelected 
                    ? 'bg-[#222E6A] text-white shadow-lg' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 cursor-pointer'
              } ${isToday && !isSelected && !isDisabled ? 'ring-2 ring-blue-400' : ''}`}
            >
              <span className="text-xs font-medium mb-0.5">{formatDayName(day)}</span>
              <span className="text-lg sm:text-xl font-bold">{day.getDate()}</span>
            </button>
          );
        })}
        </div>
      </div>
      {rosterDay ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {shifts.map((shift) => {
            // Filter out employees who are off (libur, cuti, etc.)
            const allAssignments = rosterDay.shift_assignments?.filter(a => a.shift_id === shift.id) || [];
            const assignments = allAssignments.filter(a => {
              const notes = (a.notes || '').toLowerCase().trim();
              // Check if notes contain any off-duty keywords
              if (!notes) return true; // Show if no notes
              
              // Filter out: L (Libur), CT (Cuti Tahunan), CS (Cuti Sakit), and other leave types
              return notes !== 'l' && 
                     !notes.includes('libur') && 
                     !notes.includes('cuti') && 
                     notes !== 'ct' &&
                     notes !== 'cs' &&
                     !notes.includes('off') &&
                     !notes.includes('leave') &&
                     !notes.includes('holiday');
            });
            
            const shiftManagerDuties = rosterDay.manager_duties?.filter(d => d.shift_id === shift.id) || [];
            return (
              <ShiftAssignmentCard key={shift.id} shift={shift} assignments={assignments}
                managerDuties={shiftManagerDuties}
                backgroundColor={getShiftColor(shift.name)} isReadOnly={isReadOnly}
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

const RosterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getRosterDetail, loadingStates } = useDataCache();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [staffView, setStaffView] = useState<StaffViewType>('person');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRosterDay, setSelectedRosterDay] = useState<RosterDay | null>(null);
  const [isSwapShiftModalOpen, setIsSwapShiftModalOpen] = useState(false);
  const [isLeaveRequestModalOpen, setIsLeaveRequestModalOpen] = useState(false);

  // Get roster from cache (already loaded at startup)
  const roster = id ? getRosterDetail(Number(id)) : null;
  const loading = loadingStates.rosterDetails;
  
  // Use all_shifts from roster if available, otherwise extract from assignments
  const allShifts = roster 
    ? (roster.all_shifts && roster.all_shifts.length > 0 
        ? roster.all_shifts 
        : extractShiftsFromRoster(roster))
    : [];
  
  // Filter to show only the three main shifts: Pagi, Siang, Malam (exclude standby, lepas, etc.)
  const shifts = allShifts.filter(shift => {
    const name = shift.name.toLowerCase();
    return (name === 'pagi' || name === 'shift 1 - pagi' || name === 'morning') ||
           (name === 'siang' || name === 'shift 2 - siang' || name === 'afternoon') ||
           (name === 'malam' || name === 'shift 3 - malam' || name === 'night');
  });

  // Set initial selected date when roster loads
  useEffect(() => {
    if (roster && roster.roster_days && roster.roster_days.length > 0) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // "YYYY-MM-DD"
      
      // Check if today exists in this roster period
      const todayInRoster = roster.roster_days.find(d => d.work_date === todayStr);
      
      if (todayInRoster) {
        // If today is in this roster, select today
        setSelectedDate(today);
      } else {
        // Otherwise, select first day of roster
        const firstDay = roster.roster_days[0];
        setSelectedDate(new Date(firstDay.work_date));
      }
    }
  }, [roster]);

  // Update selected roster day when date changes
  useEffect(() => {
    if (!roster || !roster.roster_days) return;
    
    const dateStr = selectedDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const rosterDay = roster.roster_days.find((d: RosterDay) => d.work_date === dateStr);
    setSelectedRosterDay(rosterDay || null);
  }, [selectedDate, roster]);

  const getMonthName = (month: number) => {
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  const getDaysInWeek = (date: Date): Date[] => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(start.setDate(diff));
    
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      week.push(current);
    }
    return week;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  const handlePrint = () => {
    window.print();
  };

  // Loading state
  if (loading) {
    return (
      <PageHeader
        title="Roster Detail"
        subtitle="Loading..."
        breadcrumbs={[
          { label: 'Rosters', href: '/rosters' },
          { label: 'Loading...' }
        ]}
      >
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#222E6A]"></div>
            </div>
          </div>
        </div>
      </PageHeader>
    );
  }

  // Error state - Only show if not loading and roster is null
  if (!loading && !roster) {
    return (
      <PageHeader
        title="Roster Detail"
        subtitle="Error"
        breadcrumbs={[
          { label: 'Rosters', href: '/rosters' },
          { label: 'Error' }
        ]}
      >
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-800 font-medium">Roster not found</p>
            </div>
          </div>
        </div>
      </PageHeader>
    );
  }

  // If roster is still null (shouldn't happen due to check above), return loading
  if (!roster) {
    return null;
  }

  return (
    <PageHeader
      title="Roster Detail"
      subtitle={`${getMonthName(roster.month)} ${roster.year} - ${roster.status === 'published' ? 'Published' : 'Draft'}`}
      breadcrumbs={[
        { label: 'Rosters', href: '/rosters' },
        { label: `${getMonthName(roster.month)} ${roster.year}` }
      ]}
    >
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab Navigation */}
          <div className="flex items-center justify-center mb-6 sm:mb-8 -mx-4 sm:mx-0">
            <div className="relative flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2 bg-white rounded-2xl shadow-lg border border-gray-200 w-full sm:max-w-2xl">
              {/* Animated Sliding Indicator - Mobile */}
              <div
                className="absolute h-[calc(100%-12px)] bg-gradient-to-br from-[#222E6A] via-[#2a3a7f] to-[#1a235c] rounded-xl transition-all duration-300 ease-out shadow-md sm:hidden"
                style={{
                  width: activeTab === 'calendar' ? 'calc(33.33% - 4px)' : activeTab === 'staff' ? 'calc(33.33% - 4px)' : 'calc(33.33% - 4px)',
                  left: activeTab === 'calendar' ? '6px' : activeTab === 'staff' ? 'calc(33.33% + 2px)' : 'calc(66.66% - 2px)',
                }}
              />
              
              {/* Animated Sliding Indicator - Desktop */}
              <div
                className="absolute h-[calc(100%-16px)] bg-gradient-to-br from-[#222E6A] via-[#2a3a7f] to-[#1a235c] rounded-xl transition-all duration-300 ease-out shadow-md hidden sm:block"
                style={{
                  width: activeTab === 'calendar' ? 'calc(33.33% - 8px)' : activeTab === 'staff' ? 'calc(33.33% - 8px)' : 'calc(33.33% - 8px)',
                  left: activeTab === 'calendar' ? '8px' : activeTab === 'staff' ? 'calc(33.33% + 4px)' : 'calc(66.66% + 0px)',
                }}
              />

              {/* Tab Buttons */}
              <button
                onClick={() => setActiveTab('calendar')}
                className={`relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-colors duration-300 whitespace-nowrap flex-1 ${
                  activeTab === 'calendar' ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Calendar</span>
              </button>

              <button
                onClick={() => setActiveTab('staff')}
                className={`relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-colors duration-300 whitespace-nowrap flex-1 ${
                  activeTab === 'staff' ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Rostered Staff</span>
                <span className="sm:hidden">Staff</span>
              </button>

              <button
                onClick={() => setActiveTab('swap')}
                className={`relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-colors duration-300 whitespace-nowrap flex-1 ${
                  activeTab === 'swap' ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Shift Swap Request</span>
                <span className="sm:hidden">Swap</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'calendar' && (
              <RosterCalendarView
                roster={roster}
                shifts={shifts}
                onPrint={handlePrint}
                currentEmployeeId={user?.employee?.id ?? undefined}
              />
            )}

            {activeTab === 'staff' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-end -mx-4 sm:mx-0 pr-0 sm:pr-0">
                  <div className="inline-flex items-center p-1 sm:p-1.5 bg-white rounded-2xl shadow-md border border-gray-200">
                    <button
                      onClick={() => setStaffView('person')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                        staffView === 'person'
                          ? 'bg-gradient-to-r from-[#454D7C] to-[#5A6299] text-white'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      Per Person
                    </button>
                    <button
                      onClick={() => setStaffView('week')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                        staffView === 'week'
                          ? 'bg-gradient-to-r from-[#454D7C] to-[#5A6299] text-white'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setStaffView('calendar')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                        staffView === 'calendar'
                          ? 'bg-gradient-to-r from-[#454D7C] to-[#5A6299] text-white'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      Weekly
                    </button>
                  </div>
                </div>

                {staffView === 'week' ? (
                  <RosterWeekView
                    weekDays={getDaysInWeek(selectedDate)}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    onNavigateWeek={navigateWeek}
                    rosterDay={selectedRosterDay || undefined}
                    shifts={shifts}
                    isReadOnly={roster.status === 'published'}
                    rosterMonth={roster.month}
                    rosterYear={roster.year}
                  />
                ) : staffView === 'person' ? (
                  <RosteredStaffPersonView roster={roster} shifts={shifts} />
                ) : (
                  <RosteredStaffCalendarView roster={roster} shifts={shifts} />
                )}
              </div>
            )}

            {activeTab === 'swap' && (
              <ShiftSwapRequestsTable
                requests={mockShiftSwapRequests}
                onRequestNew={() => setIsSwapShiftModalOpen(true)}
                onRequestLeave={() => setIsLeaveRequestModalOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Shift Swap Modal */}
      <SwapShiftModal
        isOpen={isSwapShiftModalOpen}
        onClose={() => setIsSwapShiftModalOpen(false)}
        onSuccess={() => {
          // Refresh shift swap requests after successful submission
          // TODO: Re-fetch shift swap requests from backend
          setIsSwapShiftModalOpen(false);
        }}
      />

      {/* Leave Request Modal */}
      <LeaveRequestModal
        isOpen={isLeaveRequestModalOpen}
        onClose={() => setIsLeaveRequestModalOpen(false)}
        onSuccess={() => {
          // Refresh leave requests after successful submission
          // TODO: Re-fetch leave requests from backend
          setIsLeaveRequestModalOpen(false);
        }}
      />
    </PageHeader>
  );
};

export default RosterDetailPage;

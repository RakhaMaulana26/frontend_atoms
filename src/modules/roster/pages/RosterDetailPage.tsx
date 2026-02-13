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

type TabType = 'calendar' | 'staff' | 'swap';
type StaffViewType = 'week' | 'calendar' | 'person';

// Mock shifts data - TODO: Fetch from backend (/shifts endpoint)
const mockShifts: Shift[] = [
  { id: 1, name: 'Shift 1 - Morning', start_time: '07:00:00', end_time: '15:00:00' },
  { id: 2, name: 'Shift 2 - Afternoon', start_time: '15:00:00', end_time: '23:00:00' },
  { id: 3, name: 'Shift 3 - Night', start_time: '23:00:00', end_time: '07:00:00' }
];

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
}> = ({
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
  const formatDayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' });
  const isSameDay = (d1: Date, d2: Date) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  const getShiftColor = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('morning') || n.includes('pagi')) return 'bg-blue-500';
    if (n.includes('afternoon') || n.includes('siang')) return 'bg-yellow-400';
    if (n.includes('night') || n.includes('malam')) return 'bg-green-500';
    return 'bg-purple-500';
  };
  const getUserInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? parts[0][0] + parts[1][0] : name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 -mx-7 sm:mx-0 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <button onClick={() => onNavigateWeek('prev')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">This Week</h3>
        <button onClick={() => onNavigateWeek('next')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
          return (
            <button key={idx} onClick={() => onDateSelect(day)}
              className={`flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 rounded-lg transition-all ${
                isSelected ? 'bg-[#222E6A] text-white shadow-lg' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              } ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}`}>
              <span className="text-xs font-medium mb-0.5">{formatDayName(day)}</span>
              <span className="text-lg sm:text-xl font-bold">{day.getDate()}</span>
            </button>
          );
        })}
      </div>
      {rosterDay?.manager_duties && rosterDay.manager_duties.length > 0 && (() => {
        // Show summary of all managers for this day
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
      {rosterDay && (!rosterDay.manager_duties || rosterDay.manager_duties.length === 0) && !isReadOnly && (
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-800">No manager assigned to this day yet</p>
          </div>
        </div>
      )}
      {rosterDay ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {shifts.map((shift) => {
            const assignments = rosterDay.shift_assignments?.filter(a => a.shift_id === shift.id) || [];
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
  const [staffView, setStaffView] = useState<StaffViewType>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRosterDay, setSelectedRosterDay] = useState<RosterDay | null>(null);
  const [isSwapShiftModalOpen, setIsSwapShiftModalOpen] = useState(false);

  // Get roster from cache (already loaded at startup)
  const roster = id ? getRosterDetail(Number(id)) : null;
  const loading = loadingStates.rosterDetails;

  // Set initial selected date when roster loads
  useEffect(() => {
    if (roster && roster.roster_days && roster.roster_days.length > 0) {
      const firstDay = roster.roster_days[0];
      setSelectedDate(new Date(firstDay.work_date));
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
          <div className="flex items-center justify-center mb-6 sm:mb-8 overflow-x-auto px-2">
            <div className="relative inline-flex items-center gap-1 p-1 sm:p-1.5 bg-white rounded-2xl shadow-lg border border-gray-200 min-w-max overflow-hidden">
              {/* Animated Sliding Indicator */}
              <div
                className="absolute h-[calc(100%-12px)] bg-gradient-to-br from-[#222E6A] via-[#2a3a7f] to-[#1a235c] rounded-xl transition-all duration-300 ease-out shadow-md"
                style={{
                  width: activeTab === 'calendar' ? '135px' : activeTab === 'staff' ? '170px' : '200px',
                  left: activeTab === 'calendar' ? '6px' : activeTab === 'staff' ? '145px' : '319px',
                }}
              />

              {/* Tab Buttons */}
              <button
                onClick={() => setActiveTab('calendar')}
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-colors duration-300 whitespace-nowrap ${
                  activeTab === 'calendar' ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Calendar</span>
              </button>

              <button
                onClick={() => setActiveTab('staff')}
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-colors duration-300 whitespace-nowrap ${
                  activeTab === 'staff' ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Rostered Staff</span>
              </button>

              <button
                onClick={() => setActiveTab('swap')}
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-colors duration-300 whitespace-nowrap ${
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
                shifts={mockShifts}
                onPrint={handlePrint}
                currentEmployeeId={user?.employee?.id ?? undefined}
              />
            )}

            {activeTab === 'staff' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-end px-2">
                  <div className="inline-flex items-center p-1 sm:p-1.5 bg-white rounded-2xl shadow-md border border-gray-200">
                    <button
                      onClick={() => setStaffView('week')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        staffView === 'week'
                          ? 'bg-gradient-to-r from-[#454D7C] to-[#5A6299] text-white'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setStaffView('calendar')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        staffView === 'calendar'
                          ? 'bg-gradient-to-r from-[#454D7C] to-[#5A6299] text-white'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      Calendar
                    </button>
                    <button
                      onClick={() => setStaffView('person')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        staffView === 'person'
                          ? 'bg-gradient-to-r from-[#454D7C] to-[#5A6299] text-white'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      Per Person
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
                    shifts={mockShifts}
                    isReadOnly={roster.status === 'published'}
                  />
                ) : staffView === 'person' ? (
                  <RosteredStaffPersonView roster={roster} shifts={mockShifts} />
                ) : (
                  <RosteredStaffCalendarView roster={roster} shifts={mockShifts} />
                )}
              </div>
            )}

            {activeTab === 'swap' && (
              <ShiftSwapRequestsTable
                requests={mockShiftSwapRequests}
                onRequestNew={() => setIsSwapShiftModalOpen(true)}
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
    </PageHeader>
  );
};

export default RosterDetailPage;

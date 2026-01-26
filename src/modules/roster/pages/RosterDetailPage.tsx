'use client';

import React, { useState } from 'react';
import { Calendar, Users, ArrowRightLeft, Printer } from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader';

// Mock types
interface ShiftAssignment {
  id: number;
  employee?: {
    id: number;
    user?: {
      name: string;
    };
  };
  shift?: {
    code: string;
  };
}

interface RosterDay {
  work_date: string;
  shift_assignments?: ShiftAssignment[];
}

interface RosterPeriod {
  id: number;
  month: number;
  year: number;
  status: string;
  rosterDays?: RosterDay[];
}

// Mock data
const mockRoster: RosterPeriod = {
  id: 1,
  month: 1,
  year: 2026,
  status: 'published',
  rosterDays: Array.from({ length: 31 }, (_, i) => {
    const shiftCodes = ['pagi', 'siang', 'malam', 'off'];
    const shiftCode = shiftCodes[i % 4];
    return {
      work_date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      shift_assignments: shiftCode === 'off' ? [] : [
        {
          id: i + 1,
          employee: { id: i + 1, user: { name: `Employee ${i + 1}` } },
          shift: { code: shiftCode }
        }
      ]
    };
  })
};

// Mock staff data with positions
const mockStaffData = [
  { id: 1, name: 'Michael', position: 'Technical Manager', avatar: '👨‍💼', rank: 1 },
  { id: 2, name: 'Arif', position: 'CNG Technician', avatar: '👨‍🔧', rank: 2 },
  { id: 3, name: 'Dika', position: 'CNG Technician', avatar: '👨‍🔧', rank: 2 },
  { id: 4, name: 'Reza', position: 'CNG Technician', avatar: '👨‍🔧', rank: 2 },
  { id: 5, name: 'Fajar', position: 'CNG Technician', avatar: '👨‍🔧', rank: 2 },
  { id: 6, name: 'Aldi', position: 'Support Technician', avatar: '👨‍💻', rank: 3 },
  { id: 7, name: 'Yusuf', position: 'Support Technician', avatar: '👨‍💻', rank: 3 },
];

// Mock shift swap request data
const mockShiftSwapRequests = [
  {
    id: 1,
    type: 'Swap Request',
    employee: { name: 'Arif', position: 'CNG Technician' },
    originalShift: 'Morning (07:00 - 15:00)',
    requestedShift: 'Afternoon (13:00 - 19:00)',
    submittedDate: '2026-01-20',
    status: 'Pending',
    statusColor: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: 2,
    type: 'Swap Request',
    employee: { name: 'Dika', position: 'CNG Technician' },
    originalShift: 'Afternoon (13:00 - 19:00)',
    requestedShift: 'Night (19:00 - 07:00)',
    submittedDate: '2026-01-19',
    status: 'Approved',
    statusColor: 'bg-green-100 text-green-800'
  },
  {
    id: 3,
    type: 'Swap Request',
    employee: { name: 'Reza', position: 'CNG Technician' },
    originalShift: 'Morning (07:00 - 15:00)',
    requestedShift: 'Off',
    submittedDate: '2026-01-18',
    status: 'Rejected',
    statusColor: 'bg-red-100 text-red-800'
  },
  {
    id: 4,
    type: 'Swap Request',
    employee: { name: 'Aldi', position: 'Support Technician' },
    originalShift: 'Night (19:00 - 07:00)',
    requestedShift: 'Morning (07:00 - 15:00)',
    submittedDate: '2026-01-21',
    status: 'Pending',
    statusColor: 'bg-yellow-100 text-yellow-800'
  }
];

const RosterDetailPage: React.FC = () => {
  const [roster] = useState<RosterPeriod>(mockRoster);
  const [activeTab, setActiveTab] = useState<'calendar' | 'staff' | 'swap'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 0, 16)); // Default: Jan 16, 2026 (Wednesday)

  const getMonthName = (month: number) => {
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getShiftColor = (shiftCode: string): string => {
    switch (shiftCode) {
      case 'pagi':
        return 'bg-blue-500';
      case 'siang':
        return 'bg-yellow-400';
      case 'malam':
        return 'bg-green-500';
      default:
        return 'bg-red-500';
    }
  };

  const getShiftLabel = (shiftCode: string): string => {
    switch (shiftCode) {
      case 'pagi':
        return 'Morning Shift (07.00 - 15.00)';
      case 'siang':
        return 'Afternoon Shift (13.00 - 19.00)';
      case 'malam':
        return 'Night Shift (19.00 - 07.00)';
      default:
        return 'Off Day';
    }
  };

  const getDaysInWeek = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(start.setDate(diff));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      week.push(current);
    }
    return week;
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  const getStaffByShift = (shiftCode: string) => {
    // Sort by rank (manager first, then technicians, then support)
    return [...mockStaffData].sort((a, b) => a.rank - b.rank);
  };

  const renderRosteredStaff = () => {
    const weekDays = getDaysInWeek(selectedDate);
    const shifts = ['pagi', 'siang', 'malam'];

    return (
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">This Week</h3>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Week Days Selector - Responsive Grid */}
        <div className="grid grid-cols-7 sm:grid-cols-14 gap-1 mb-6 sm:mb-8 overflow-x-auto">
          {weekDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <button
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center justify-center py-2 px-1 sm:py-3 sm:px-2 rounded-lg transition-all text-center ${
                  isSelected
                    ? 'bg-[#222E6A] text-white shadow-lg'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-xs font-medium mb-0.5">{formatDayName(day)}</span>
                <span className="text-lg sm:text-xl font-bold">{day.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Info */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl">
              👨‍💼
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Michael</h4>
              <p className="text-sm text-gray-500">Technical Manager</p>
            </div>
          </div>
        </div>

        {/* Shifts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {shifts.map((shiftCode, index) => {
            const staff = getStaffByShift(shiftCode);
            const bgColor = getShiftColor(shiftCode);
            
            return (
              <div key={index} className="border-2 border-gray-200 rounded-2xl overflow-hidden">
                {/* Shift Header */}
                <div className={`${bgColor} text-white px-4 py-3 font-bold text-center`}>
                  {getShiftLabel(shiftCode)}
                </div>
                
                {/* Staff List */}
                <div className="p-4 space-y-3 bg-white">
                  {staff.map((person) => (
                    <div key={person.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">
                        {person.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{person.name}</p>
                        <p className="text-xs text-gray-500 truncate">{person.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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

    // Create a map of dates to shift codes
    const dateShiftMap = new Map<number, string>();
    roster.rosterDays?.forEach(day => {
      const dateObj = new Date(day.work_date);
      const dayOfMonth = dateObj.getDate();
      if (day.shift_assignments && day.shift_assignments.length > 0) {
        const shiftCode = day.shift_assignments[0].shift?.code || 'off';
        dateShiftMap.set(dayOfMonth, shiftCode);
      } else {
        dateShiftMap.set(dayOfMonth, 'off');
      }
    });

    // Group days into weeks
    const weeks = [];
    let currentWeek: (number | null | string)[] = [];
    
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
    
    // Fill remaining slots in last week with next month placeholder
    let nextMonthDay = 1;
    while (currentWeek.length < 7) {
      currentWeek.push(`next-${nextMonthDay}`);
      nextMonthDay++;
    }
    weeks.push(currentWeek);

    return (
      <>
        {/* Print View Button - Outside calendar container */}
        <div className="flex justify-end mb-4">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-900 shadow-md border border-gray-200">
            <Printer className="h-5 w-5" />
            <span>Print View</span>
          </button>
        </div>

        <div className="rounded-3xl p-4 sm:p-6 lg:p-10 shadow-lg border border-gray-100" style={{ backgroundColor: '#222E6A' }}>
          {/* Header */}
          <div className="flex items-center justify-center mb-6 sm:mb-8 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{getMonthName(roster.month)}</h2>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse space-y-3">
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
                        const shiftCode = dateShiftMap.get(dayValue) || 'off';
                        const bgColor = getShiftColor(shiftCode);
                        content = (
                          <div
                            className={`w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center rounded-lg font-bold text-white text-xs sm:text-base cursor-pointer hover:shadow-xl transition-shadow mx-auto ${bgColor}`}
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

        {/* Legend - Terpisah dari container kalender */}
        <div className="flex items-center justify-center gap-16 mt-8 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-500 rounded" />
            <span className="text-sm font-medium text-black">Morning</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-yellow-400 rounded" />
            <span className="text-sm font-medium text-black">Afternoon</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded" />
            <span className="text-sm font-medium text-black">Night</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-red-500 rounded" />
            <span className="text-sm font-medium text-black">Off</span>
          </div>
        </div>
      </>
    );
  };

  return (
    <PageHeader
      title="Work Schedule"
      subtitle={`${getMonthName(roster.month)} ${roster.year}`}
      breadcrumbs={[
        { label: 'Rosters', href: '/rosters' },
        { label: `${getMonthName(roster.month)} ${roster.year}` }
      ]}
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center p-1.5 bg-white rounded-2xl shadow-lg border border-gray-200">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-gradient-to-r from-[#454D7C] to-[#5A6299] text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Calendar className="h-5 w-5" />
                <span>Calendar</span>
              </button>

              <button
                onClick={() => setActiveTab('staff')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                  activeTab === 'staff'
                    ? 'bg-gradient-to-r from-[#454D7C] to-[#5A6299] text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Users className="h-5 w-5" />
                <span>Rostered Staff</span>
              </button>

              <button
                onClick={() => setActiveTab('swap')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                  activeTab === 'swap'
                    ? 'bg-gradient-to-r from-[#454D7C] to-[#5A6299] text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <ArrowRightLeft className="h-5 w-5" />
                <span>Shift Swap Request</span>
              </button>
            </div>
          </div>

          <div>
            {activeTab === 'calendar' && renderCalendar()}

            {activeTab === 'staff' && (
              renderRosteredStaff()
            )}

            {activeTab === 'swap' && (
              <div>
                {/* Request Button */}
                <div className="mb-6">
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-[#222E6A] hover:bg-[#1a235c] rounded-lg transition-colors font-medium text-white">
                    <span className="text-xl">+</span>
                    <span>Request Shift Swap</span>
                  </button>
                </div>

                {/* Shift Swap Request List */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Shift Swap Request List</h3>
                    <p className="text-sm text-gray-600">The following is a list of submitted requests and their verification status</p>
                  </div>

                  {/* Filter and Search Section */}
                  <div className="p-6 bg-[#222E6A]">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">Items per page</span>
                        <select className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium">
                          <option>25</option>
                          <option>50</option>
                          <option>100</option>
                        </select>
                      </div>
                      <div className="ml-auto">
                        <input
                          type="text"
                          placeholder="Search"
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="relative">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <div className="inline-block min-w-full">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-[#454D7C]">
                              <th className="px-6 py-4 text-left text-white font-semibold text-sm">
                                <div className="flex items-center gap-2">
                                  <span>Requests Type</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                  </svg>
                                </div>
                              </th>
                              <th className="px-6 py-4 text-left text-white font-semibold text-sm">
                                <div className="flex items-center gap-2">
                                  <span>Name & Position</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                  </svg>
                                </div>
                              </th>
                              <th className="px-6 py-4 text-left text-white font-semibold text-sm">
                                <div className="flex items-center gap-2">
                                  <span>Orig. Shift</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                  </svg>
                                </div>
                              </th>
                              <th className="px-6 py-4 text-left text-white font-semibold text-sm">
                                <div className="flex items-center gap-2">
                                  <span>Req Shift</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                  </svg>
                                </div>
                              </th>
                              <th className="px-6 py-4 text-left text-white font-semibold text-sm">
                                <div className="flex items-center gap-2">
                                  <span>Submitted</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                  </svg>
                                </div>
                              </th>
                              <th className="px-6 py-4 text-left text-white font-semibold text-sm">
                                <div className="flex items-center gap-2">
                                  <span>Status</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                  </svg>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {mockShiftSwapRequests.map((request) => (
                              <tr key={request.id} className="border-t border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{request.type}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  <div>
                                    <p className="font-medium">{request.employee.name}</p>
                                    <p className="text-xs text-gray-500">{request.employee.position}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">{request.originalShift}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{request.requestedShift}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{request.submittedDate}</td>
                                <td className="px-6 py-4 text-sm">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${request.statusColor}`}>
                                    {request.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Scroll Indicator for Mobile */}
                    <div className="lg:hidden flex items-center justify-center py-2 bg-gray-50 border-t border-gray-200">
                      <svg className="w-5 h-5 text-gray-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                      <span className="ml-2 text-xs text-gray-500 font-medium">Swipe to see more</span>
                    </div>
                  </div>

                  {/* Pagination */}
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Showing 1 to 4 of 4 entries</span>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button className="px-3 py-2 bg-[#222E6A] text-white rounded-lg font-medium">1</button>
                      <button className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageHeader>
  );
};

export default RosterDetailPage;
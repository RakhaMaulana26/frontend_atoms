import React, { useState, useEffect } from 'react';
import { Calendar, ArrowLeft, User, Bell, Users, ArrowRightLeft, Home, ChevronRight } from 'lucide-react';
import LoadingScreen from '../../../components/common/LoadingScreen';

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
  rosterDays: Array.from({ length: 31 }, (_, i) => ({
    work_date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    shift_assignments: [
      {
        id: 1,
        employee: { id: 1, user: { name: 'John Doe' } },
        shift: { code: 'pagi' }
      },
      {
        id: 2,
        employee: { id: 2, user: { name: 'Jane Smith' } },
        shift: { code: 'siang' }
      },
      {
        id: 3,
        employee: { id: 3, user: { name: 'Bob Wilson' } },
        shift: { code: 'malam' }
      }
    ]
  }))
};

const RosterDetailPage: React.FC = () => {
  const [roster] = useState<RosterPeriod>(mockRoster);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'staff' | 'swap'>('calendar');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const handleTabChange = (newTab: 'calendar' | 'staff' | 'swap') => {
    const tabs = ['calendar', 'staff', 'swap'];
    const currentIndex = tabs.indexOf(activeTab);
    const newIndex = tabs.indexOf(newTab);
    
    setSlideDirection(newIndex > currentIndex ? 'right' : 'left');
    setActiveTab(newTab);
  };

  const getMonthName = (month: number) => {
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const renderCalendarGrid = () => {
    if (!roster) return null;

    const daysInMonth = getDaysInMonth(roster.year, roster.month);
    const firstDay = getFirstDayOfMonth(roster.year, roster.month);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const emptyCells = Array.from({ length: firstDay }, (_, i) => i);

    const getRosterDayData = (day: number): RosterDay | undefined => {
      const dateStr = `${roster.year}-${String(roster.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return roster.rosterDays?.find(rd => rd.work_date === dateStr);
    };

    const getShiftEmployees = (rosterDay: RosterDay | undefined, shiftCode: string) => {
      if (!rosterDay?.shift_assignments) return [];
      return rosterDay.shift_assignments.filter(sa => sa.shift?.code === shiftCode);
    };

    return (
      <div className="grid grid-cols-7 gap-1 mt-6">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 bg-[#454D7C] text-white text-center text-xs md:text-sm font-medium">
            {day}
          </div>
        ))}
        
        {emptyCells.map(index => (
          <div key={`empty-${index}`} className="h-24 md:h-32 bg-gray-100"></div>
        ))}
        
        {daysArray.map(day => {
          const rosterDay = getRosterDayData(day);
          const morningShifts = getShiftEmployees(rosterDay, 'pagi');
          const afternoonShifts = getShiftEmployees(rosterDay, 'siang');
          const nightShifts = getShiftEmployees(rosterDay, 'malam');

          return (
            <div key={day} className="h-24 md:h-32 bg-white border border-gray-200 p-1 overflow-hidden">
              <div className="text-xs font-medium text-gray-600 mb-1">{day}</div>
              
              {morningShifts.length > 0 && (
                <div className="mb-1">
                  <div className="bg-blue-500 text-white text-xs px-1 rounded mb-1">
                    Morning 07:00-12:00
                  </div>
                  {morningShifts.slice(0, 2).map((assignment, index) => (
                    <div key={index} className="text-xs text-gray-700 truncate">
                      {assignment.employee?.user?.name || `Employee ${assignment.employee?.id}` || 'Unassigned'}
                    </div>
                  ))}
                  {morningShifts.length > 2 && (
                    <div className="text-xs text-gray-500">+{morningShifts.length - 2} more</div>
                  )}
                </div>
              )}

              {afternoonShifts.length > 0 && (
                <div className="mb-1">
                  <div className="bg-yellow-500 text-white text-xs px-1 rounded mb-1">
                    Afternoon 12:00-16:00
                  </div>
                  {afternoonShifts.slice(0, 2).map((assignment, index) => (
                    <div key={index} className="text-xs text-gray-700 truncate">
                      {assignment.employee?.user?.name || `Employee ${assignment.employee?.id}` || 'Unassigned'}
                    </div>
                  ))}
                  {afternoonShifts.length > 2 && (
                    <div className="text-xs text-gray-500">+{afternoonShifts.length - 2} more</div>
                  )}
                </div>
              )}

              {nightShifts.length > 0 && (
                <div>
                  <div className="bg-green-500 text-white text-xs px-1 rounded mb-1">
                    Night 19:00-23:00
                  </div>
                  {nightShifts.slice(0, 2).map((assignment, index) => (
                    <div key={index} className="text-xs text-gray-700 truncate">
                      {assignment.employee?.user?.name || `Employee ${assignment.employee?.id}` || 'Unassigned'}
                    </div>
                  ))}
                  {nightShifts.length > 2 && (
                    <div className="text-xs text-gray-500">+{nightShifts.length - 2} more</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <LoadingScreen 
        title="Loading Roster Details"
        subtitle="Please wait while we fetch roster information..."
        icon={Calendar}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Home className="h-4 w-4" />
              <span>Rosters</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white font-medium">{getMonthName(roster.month)} {roster.year}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
              </button>
              <button className="flex items-center space-x-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">
                <User className="h-5 w-5" />
                <span className="text-sm hidden sm:inline">Admin User</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/30 transition-colors">
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Work Schedule</h1>
                <p className="text-sm opacity-90">{getMonthName(roster.month)} {roster.year}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                roster.status === 'published' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-yellow-500 text-white'
              }`}>
                {roster.status.charAt(0).toUpperCase() + roster.status.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Menu with Sliding Animation */}
        <div className="flex items-center justify-center mb-8">
          <div className="relative inline-flex items-center p-1.5 bg-white rounded-2xl shadow-lg border border-gray-200">
            {/* Sliding Background */}
            <div
              className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-[#454D7C] to-[#5A6299] transition-all duration-500 ease-out shadow-md"
              style={{
                width: activeTab === 'calendar' ? '140px' : activeTab === 'staff' ? '170px' : '210px',
                left: activeTab === 'calendar' ? '6px' : activeTab === 'staff' ? '152px' : '328px',
              }}
            ></div>

            {/* Tab Buttons */}
            <button
              onClick={() => handleTabChange('calendar')}
              className={`relative z-10 flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl font-medium transition-colors duration-300 whitespace-nowrap text-sm ${
                activeTab === 'calendar'
                  ? 'text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              style={{ width: '140px', justifyContent: 'center' }}
            >
              <Calendar className="h-5 w-5 flex-shrink-0" />
              <span>Calendar</span>
            </button>

            <button
              onClick={() => handleTabChange('staff')}
              className={`relative z-10 flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl font-medium transition-colors duration-300 whitespace-nowrap text-sm ${
                activeTab === 'staff'
                  ? 'text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              style={{ width: '170px', justifyContent: 'center' }}
            >
              <Users className="h-5 w-5 flex-shrink-0" />
              <span>Rostered Staff</span>
            </button>

            <button
              onClick={() => handleTabChange('swap')}
              className={`relative z-10 flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl font-medium transition-colors duration-300 whitespace-nowrap text-sm ${
                activeTab === 'swap'
                  ? 'text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              style={{ width: '210px', justifyContent: 'center' }}
            >
              <ArrowRightLeft className="h-5 w-5 flex-shrink-0" />
              <span>Shift Swap Request</span>
            </button>
          </div>
        </div>

        {/* Card with Animated Content */}
        <div className="relative overflow-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div
              key={activeTab}
              className={`transition-all duration-500 ease-out ${
                slideDirection === 'right' ? 'animate-slideInRight' : 'animate-slideInLeft'
              }`}
            >
              {/* Calendar View Tab */}
              {activeTab === 'calendar' && (
                <>
                  {/* Legend */}
                  <div className="flex items-center justify-center space-x-6 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-sm font-medium">Morning</span>
                      <span className="text-xs text-gray-500">07:00 - 12:00</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="text-sm font-medium">Afternoon</span>
                      <span className="text-xs text-gray-500">12:00 - 16:00</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-sm font-medium">Night</span>
                      <span className="text-xs text-gray-500">19:00 - 23:00</span>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  {renderCalendarGrid()}
                  
                  {/* Summary */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Roster Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total Days:</span> {roster.rosterDays?.length || 0}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> 
                        <span className={`ml-1 ${roster.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {roster.status.charAt(0).toUpperCase() + roster.status.slice(1)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Period:</span> {getMonthName(roster.month)} {roster.year}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Rostered Staff Tab */}
              {activeTab === 'staff' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Rostered Staff</h3>
                  <div className="space-y-4">
                    <p className="text-gray-600">Staff assignment details for {getMonthName(roster.month)} {roster.year}</p>
                    {roster.rosterDays && roster.rosterDays.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Date</th>
                              <th className="px-4 py-2 text-left font-medium">Morning</th>
                              <th className="px-4 py-2 text-left font-medium">Afternoon</th>
                              <th className="px-4 py-2 text-left font-medium">Night</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roster.rosterDays.map((day, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium">{day.work_date}</td>
                                <td className="px-4 py-2">
                                  {day.shift_assignments
                                    ?.filter(sa => sa.shift?.code === 'pagi')
                                    .map((sa, i) => (
                                      <div key={i} className="text-xs">
                                        {sa.employee?.user?.name || 'Unassigned'}
                                      </div>
                                    ))}
                                </td>
                                <td className="px-4 py-2">
                                  {day.shift_assignments
                                    ?.filter(sa => sa.shift?.code === 'siang')
                                    .map((sa, i) => (
                                      <div key={i} className="text-xs">
                                        {sa.employee?.user?.name || 'Unassigned'}
                                      </div>
                                    ))}
                                </td>
                                <td className="px-4 py-2">
                                  {day.shift_assignments
                                    ?.filter(sa => sa.shift?.code === 'malam')
                                    .map((sa, i) => (
                                      <div key={i} className="text-xs">
                                        {sa.employee?.user?.name || 'Unassigned'}
                                      </div>
                                    ))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500">No staff assignments yet</p>
                    )}
                  </div>
                </div>
              )}

              {/* Shift Swap Request Form Tab */}
              {activeTab === 'swap' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Shift Swap Request Form</h3>
                  <div className="space-y-4 max-w-2xl">
                    <p className="text-gray-600">Submit a shift swap request for {getMonthName(roster.month)} {roster.year}</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        Coming soon. You will be able to submit shift swap requests here.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default RosterDetailPage;
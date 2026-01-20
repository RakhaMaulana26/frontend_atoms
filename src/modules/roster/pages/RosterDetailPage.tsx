import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Card from '../../../components/common/Card';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { Calendar, ArrowLeft, User, Bell } from 'lucide-react';
import { useAuth } from '../../auth/core/AuthContext';
import { rosterService } from '../repository/rosterService';
import type { RosterPeriod, RosterDay } from '../../../types';

const RosterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roster, setRoster] = useState<RosterPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadRosterDetail(parseInt(id));
    }
  }, [id]);

  const loadRosterDetail = async (rosterId: number) => {
    setIsLoading(true);
    try {
      const data = await rosterService.getRoster(rosterId);
      setRoster(data);
    } catch (error) {
      console.error('Failed to load roster detail:', error);
      toast.error('Failed to load roster details');
      navigate('/rosters');
    } finally {
      setIsLoading(false);
    }
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
    
    // Create empty cells for days before the first day of month
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
        {/* Header with day names */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 bg-[#454D7C] text-white text-center text-xs md:text-sm font-medium">
            {day}
          </div>
        ))}
        
        {/* Empty cells for days before month starts */}
        {emptyCells.map(index => (
          <div key={`empty-${index}`} className="h-24 md:h-32 bg-gray-100"></div>
        ))}
        
        {/* Calendar days */}
        {daysArray.map(day => {
          const rosterDay = getRosterDayData(day);
          const morningShifts = getShiftEmployees(rosterDay, 'pagi');
          const afternoonShifts = getShiftEmployees(rosterDay, 'siang');
          const nightShifts = getShiftEmployees(rosterDay, 'malam');

          return (
            <div key={day} className="h-24 md:h-32 bg-white border border-gray-200 p-1 overflow-hidden">
              <div className="text-xs font-medium text-gray-600 mb-1">{day}</div>
              
              {/* Morning Shift - Blue */}
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

              {/* Afternoon Shift - Yellow */}
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

              {/* Night Shift - Green */}
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#454D7C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading roster details...</p>
        </div>
      </div>
    );
  }

  if (!roster) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Roster Not Found</h3>
          <p className="text-gray-600 mb-4">The requested roster could not be found.</p>
          <button 
            onClick={() => navigate('/rosters')}
            className="bg-[#454D7C] text-white px-4 py-2 rounded-lg hover:bg-[#222E6A]"
          >
            Back to Rosters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs items={[
              { label: 'Rosters', href: '/rosters' },
              { label: `${getMonthName(roster.month)} ${roster.year}` }
            ]} />
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/notifications')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Bell className="h-5 w-5" />
              </button>
              <button 
                onClick={() => navigate('/home')}
                className="flex items-center space-x-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="text-sm hidden sm:inline">{user?.name}</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/rosters')}
                className="bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/30 transition-colors"
              >
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
        <Card>
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
        </Card>
      </div>
    </div>
  );
};

export default RosterDetailPage;
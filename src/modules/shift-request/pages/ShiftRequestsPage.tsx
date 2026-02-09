import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Breadcrumbs } from '../../../components';
import { RefreshCw, Plus, Bell, User } from 'lucide-react';
import { useAuth } from '../../auth/core/AuthContext';

const ShiftRequestsPage: React.FC = () => {
  const [requests] = useState<any[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs items={[{ label: 'Shift Requests' }]} />
            
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
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <RefreshCw className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Shift Requests</h1>
                <p className="text-sm opacity-90">Manage shift swap requests</p>
              </div>
            </div>
            
            <button className="bg-white text-[#222E6A] hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-[#D8DAED] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="h-10 w-10 text-[#454D7C]" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Shift Requests</h3>
            <p className="text-gray-600 mb-6">
              Create a shift swap request when you need to change your schedule
            </p>
            <button className="bg-[#222E6A] hover:bg-[#1a2550] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-md hover:shadow-lg inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Create Request
            </button>
          </div>
        ) : (
          <div>Shift requests will appear here</div>
        )}
      </Card>
      </div>
    </div>
  );
};

export default ShiftRequestsPage;

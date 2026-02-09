import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { PageHeader } from '../components';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageHeader
      title="System Settings"
      subtitle="Configure system preferences and user settings"
    >
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">System Settings</h3>
          <p className="text-gray-600 mb-4">Settings and configuration panel is under development</p>
          <button 
            onClick={() => navigate('/home')}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </PageHeader>
  );
};

export default SettingsPage;
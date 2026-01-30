import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';

const PersonnelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageHeader
      title="Personnel Management"
      subtitle="Manage employee records and organizational structure"
    >
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Personnel Management Module</h3>
          <p className="text-gray-600 mb-4">This module is under development. Use Employee Management menu for full features.</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => navigate('/personnel')}
              className="bg-[#222E6A] text-white px-6 py-2 rounded-lg hover:bg-[#1a2550] transition-colors flex items-center gap-2"
            >
              <Users className="h-5 w-5" />
              Employee Management
            </button>
            <button 
              onClick={() => navigate('/home')}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </PageHeader>
  );
};

export default PersonnelPage;

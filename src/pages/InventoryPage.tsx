import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Archive, AlertTriangle, Bell, User } from 'lucide-react';
import { Breadcrumbs } from '../components';
import { useAuth } from '../modules/auth/core/AuthContext';

const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const inventoryStats = [
    { id: 1, title: 'Total Items', count: 0, icon: Package, color: 'text-[#454D7C]' },
    { id: 2, title: 'In Stock', count: 0, icon: Archive, color: 'text-[#454D7C]' },
    { id: 3, title: 'Low Stock', count: 0, icon: AlertTriangle, color: 'text-[#454D7C]' },
    { id: 4, title: 'Orders', count: 0, icon: ShoppingCart, color: 'text-[#454D7C]' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs items={[{ label: 'Inventory Management' }]} />
            
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
          
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Inventory Management</h1>
              <p className="text-sm opacity-90">Manage company inventory and assets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {inventoryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                  <span className={`text-3xl font-bold ${stat.color}`}>{stat.count}</span>
                </div>
                <h3 className="text-gray-900 font-semibold">{stat.title}</h3>
              </div>
            );
          })}
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-[#D8DAED] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-10 w-10 text-[#454D7C]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Coming Soon</h2>
            <p className="text-gray-600 mb-6">
              The Inventory Management feature is under development and will be available soon.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="bg-[#222E6A] hover:bg-[#1a2550] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-md hover:shadow-lg"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;

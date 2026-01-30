import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/core/AuthContext';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { Users, Calendar, RefreshCw, Bell, Wrench, Package } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Total Users',
      value: '0',
      icon: Users,
      color: 'bg-blue-500',
      link: '/admin/users',
      roles: ['Admin'],
    },
    {
      title: 'Active Rosters',
      value: '0',
      icon: Calendar,
      color: 'bg-green-500',
      link: '/rosters',
      roles: ['Admin', 'Manager Teknik', 'General Manager'],
    },
    {
      title: 'Pending Requests',
      value: '0',
      icon: RefreshCw,
      color: 'bg-yellow-500',
      link: '/shift-requests',
      roles: ['all'],
    },
    {
      title: 'Notifications',
      value: '0',
      icon: Bell,
      color: 'bg-red-500',
      link: '/notifications',
      roles: ['all'],
    },
  ];

  const filteredStats = stats.filter(
    (stat) => stat.roles.includes('all') || stat.roles.includes(user?.role || '')
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's your overview of the AIRNAV Rostering System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`${stat.color} p-4 rounded-lg`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {user?.role === 'Admin' && (
            <>
              <Button
                variant="primary"
                onClick={() => navigate('/admin/users')}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/personnel')}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Personnel Management
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/maintenance')}
                className="w-full"
              >
                <Wrench className="h-4 w-4 mr-2" />
                Maintenance
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/inventory')}
                className="w-full"
              >
                <Package className="h-4 w-4 mr-2" />
                Inventory
              </Button>
            </>
          )}
          {(user?.role === 'Admin' || user?.role === 'Manager Teknik' || user?.role === 'General Manager') && (
            <Button
              variant="primary"
              onClick={() => navigate('/rosters')}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Rosters
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => navigate('/shift-requests')}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Shift Requests
          </Button>
        </div>
      </Card>

      {/* System Info */}
      <Card title="System Information">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Role:</span>
            <span className="font-medium text-gray-900 uppercase">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
              Active
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;

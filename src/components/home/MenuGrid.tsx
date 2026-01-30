import React from 'react';
import { useNavigate } from 'react-router-dom';

interface MenuGridProps {
  isInitialized?: boolean;
}

const MenuGrid: React.FC<MenuGridProps> = ({ isInitialized = true }) => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Rostering',
      icon: '/assets/icon/rostering.svg',
      route: '/roster',
      gradient: 'from-blue-50 to-blue-100'
    },
    {
      title: 'Employee Management',
      icon: '/assets/icon/employee-management.svg',
      route: '/personnel',
      gradient: 'from-purple-50 to-purple-100'
    },
    {
      title: 'Inventory',
      icon: '/assets/icon/inventory.svg',
      route: '/inventory',
      gradient: 'from-orange-50 to-orange-100'
    },
    {
      title: 'Maintenance',
      icon: '/assets/icon/maintenance.svg',
      route: '/maintenance',
      gradient: 'from-cyan-50 to-cyan-100'
    },
    {
      title: 'Notifications',
      icon: '/assets/icon/notifications.svg',
      route: '/notifications',
      gradient: 'from-green-50 to-green-100'
    },
    {
      title: 'Logs & Report',
      icon: '/assets/icon/log-activity.svg',
      route: '/activity-logs',
      gradient: 'from-pink-50 to-pink-100'
    }
  ];

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-[#222E6A] mb-8">
        Menu
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-8">
        {menuItems.map((item) => (
          <div
            key={item.title}
            onClick={() => isInitialized && navigate(item.route)}
            className={`group flex flex-col items-center ${
              isInitialized ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
            }`}
          >
            <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-md group-hover:shadow-xl mb-3 border border-gray-200">
              <img 
                src={item.icon} 
                alt={item.title} 
                className="w-24 h-24 object-contain"
              />
            </div>
            <h3 className="text-sm font-semibold text-[#222E6A] group-hover:text-[#454D7C] transition-colors text-center">
              {item.title}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuGrid;

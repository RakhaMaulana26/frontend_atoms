import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  href?: string; // Add href support
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center space-x-2 text-sm">
      <button
        onClick={() => navigate('/home')}
        className="flex items-center text-gray-700 hover:text-gray-900 transition-colors"
      >
        <Home className="h-4 w-4" />
      </button>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const hasLink = (item.path || item.href) && !isLast;
        
        return (
          <React.Fragment key={index}>
            <ChevronRight className="h-4 w-4 text-gray-500" />
            {hasLink ? (
              <button
                onClick={() => {
                  if (item.path) navigate(item.path);
                  else if (item.href) navigate(item.href);
                }}
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'text-gray-900 font-semibold' : 'text-gray-600'}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;

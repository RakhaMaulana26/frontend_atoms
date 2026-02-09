import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar } from 'lucide-react';
import Button from '../../ui/Button';

const TodayScheduleBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] rounded-2xl p-8 text-white relative overflow-hidden mb-8">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-4 left-8 w-16 h-16 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-12 right-16 w-8 h-8 bg-white/15 rounded-full blur-lg"></div>
          <div className="absolute bottom-8 left-12 w-12 h-12 bg-white/12 rounded-full blur-md animate-pulse delay-1000"></div>
          <div className="absolute bottom-16 right-8 w-6 h-6 bg-white/18 rounded-full blur-sm"></div>
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/8 rounded-full blur-2xl animate-pulse delay-500"></div>
          <div className="absolute top-1/3 right-1/3 w-14 h-14 bg-white/10 rounded-full blur-lg animate-pulse delay-2000"></div>
        </div>
      </div>
      
      {/* Geometric Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="waves" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M0,10 Q10,0 20,10 T40,10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4"/>
              <path d="M0,15 Q10,5 20,15 T40,15" fill="none" stroke="white" strokeWidth="0.3" opacity="0.3"/>
            </pattern>
            <pattern id="curvedlines" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M0,15 Q15,5 30,15 Q15,25 0,15" fill="none" stroke="white" strokeWidth="0.4" opacity="0.2"/>
            </pattern>
            <pattern id="dots" width="25" height="25" patternUnits="userSpaceOnUse">
              <circle cx="12.5" cy="12.5" r="1" fill="white" opacity="0.15"/>
              <circle cx="6" cy="6" r="0.5" fill="white" opacity="0.1"/>
              <circle cx="18" cy="18" r="0.8" fill="white" opacity="0.12"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#waves)" />
          <rect width="100%" height="100%" fill="url(#curvedlines)" />
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
      
      {/* Wave Animation Overlay */}
      <div className="absolute inset-0 opacity-8">
        <svg className="w-full h-full animate-pulse" viewBox="0 0 1000 400" preserveAspectRatio="none">
          <path 
            d="M0,100 Q250,50 500,100 T1000,100 L1000,0 L0,0 Z" 
            fill="rgba(255,255,255,0.05)"
            className="animate-pulse"
          />
          <path 
            d="M0,200 Q250,150 500,200 T1000,200 L1000,100 L0,100 Z" 
            fill="rgba(255,255,255,0.03)"
            style={{ animationDelay: '1s' }}
            className="animate-pulse"
          />
          <path 
            d="M0,300 Q250,250 500,300 T1000,300 L1000,200 L0,200 Z" 
            fill="rgba(255,255,255,0.02)"
            style={{ animationDelay: '2s' }}
            className="animate-pulse"
          />
        </svg>
      </div>
      
      {/* Flowing Wave Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.08) 1px, transparent 1px),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 15px,
              rgba(255,255,255,0.03) 15px,
              rgba(255,255,255,0.03) 16px
            )
          `,
          backgroundSize: '50px 50px, 30px 30px, 100% 100%'
        }}></div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
          <div className="mb-6 lg:mb-0">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Today's Schedule
            </h3>
            <p className="text-lg opacity-90">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                On Schedule
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                7:00AM - 13:00PM
              </span>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={() => navigate('/roster')}
              variant="outline"
              leftIcon={<Calendar />}
              className="bg-white text-[#222E6A] border-white hover:bg-gray-100 font-semibold"
            >
              View Full Roster
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodayScheduleBanner;

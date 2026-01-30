import React from 'react';
import { useNavigate } from 'react-router-dom';
import IllustrationSvg from '../assets/Illus.svg';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen h-screen flex flex-col items-center justify-center bg-[#454D7C] px-4 overflow-hidden relative">
      {/* Wave Layer */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 md:h-1/3 min-h-[250px] transform origin-bottom scale-[1.35] md:scale-100">
        <svg 
          viewBox="0 0 1440 500" 
          className="absolute bottom-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Dark Blue Wave - Lapisan pertama */}
          <path 
            fill="#2B3A67" 
            fillOpacity="1" 
            d="M0,150L48,160C96,170,192,190,288,190C384,190,480,170,576,155C672,140,768,130,864,135C960,140,1056,160,1152,170C1248,180,1344,180,1392,180L1440,180L1440,500L1392,500C1344,500,1248,500,1152,500C1056,500,960,500,864,500C768,500,672,500,576,500C480,500,384,500,288,500C192,500,96,500,48,500L0,500Z"
          ></path>
          {/* White Wave - Lapisan kedua (lebih dekat dengan dark blue) */}
          <path 
            fill="#ffffff" 
            fillOpacity="1" 
            d="M0,190L48,200C96,210,192,230,288,230C384,230,480,210,576,195C672,180,768,170,864,175C960,180,1056,200,1152,210C1248,220,1344,220,1392,220L1440,220L1440,500L1392,500C1344,500,1248,500,1152,500C1056,500,960,500,864,500C768,500,672,500,576,500C480,500,384,500,288,500C192,500,96,500,48,500L0,500Z"
          ></path>
        </svg>
      </div>
      
      <div className="relative z-10 max-w-3xl w-full text-center flex flex-col items-center justify-center space-y-2 py-4">
        {/* Title */}
        <div className="space-y-0 animate-fade-slide-down">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            AirNav
          </h1>
          <h2 className="text-sm md:text-base font-semibold text-gray-200">
            Technical Operation Management System
          </h2>
        </div>

        {/* Illustration */}
        <div className="flex justify-center py-1 animate-fade-slide-up">
          <img 
            src={IllustrationSvg} 
            alt="AirNav ATOMS Illustration" 
            className="w-full max-w-[200px] md:max-w-xs h-auto drop-shadow-2xl"
          />
        </div>

        {/* Welcome Section */}
        <div className="space-y-2 animate-fade-in-delay-2 w-full max-w-2xl">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-500">
            Welcome!
          </h3>
          <p className="text-sm md:text-base max-w-2xl mx-auto leading-relaxed" style={{ color: '#929292' }}>
            Enjoy a new experience with ATOMS (AirNav Technical Operation Management System)
          </p>
        </div>

        {/* Get Started Button */}
        <div className="pt-4 animate-fade-scale-up w-full max-w-md">
          <button
            onClick={handleGetStarted}
            className="w-full bg-[#1a2547] hover:bg-[#0f1629] text-white font-semibold text-base md:text-lg px-8 py-3 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import IllustrationSvg from '../assets/Illus.svg';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#454D7C] px-4 overflow-hidden relative">
      {/* Middle layer */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 animate-fade-in">
        <svg 
          viewBox="0 0 1440 320" 
          className="absolute bottom-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <path 
            fill="#222E6A" 
            fillOpacity="1" 
            d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,154.7C672,160,768,224,864,224C960,224,1056,160,1152,144C1248,128,1344,160,1392,176L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>
      
      {/* Bottom white wave layer */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 animate-fade-in-delay">
        <svg 
          viewBox="0 0 1440 320" 
          className="absolute bottom-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <path 
            fill="#ffffff" 
            fillOpacity="1" 
            d="M0,224L48,208C96,192,192,160,288,154.7C384,149,480,171,576,186.7C672,203,768,213,864,197.3C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>
      
      <div className="relative z-10 max-w-3xl w-full text-center flex flex-col items-center justify-center space-y-3 py-4">
        {/* Title */}
        <div className="space-y-0.5 animate-fade-slide-down">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            AirNav
          </h1>
          <h2 className="text-lg md:text-xl font-semibold text-white">
            Technical Operation Management System
          </h2>
        </div>

        {/* Illustration */}
        <div className="flex justify-center py-2 animate-fade-slide-up">
          <img 
            src={IllustrationSvg} 
            alt="AirNav ATOMS Illustration" 
            className="w-full max-w-xs md:max-w-sm h-auto drop-shadow-2xl"
          />
        </div>

        {/* Welcome Section */}
        <div className="space-y-2 animate-fade-in-delay-2">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-100">
            Welcome!
          </h3>
          <p className="text-sm md:text-base text-gray-200 max-w-xl mx-auto px-4">
            Enjoy a new experience with ATOMS (AirNav Technical Operation Management System)
          </p>
        </div>

        {/* Get Started Button */}
        <div className="pt-2 animate-fade-scale-up">
          <button
            onClick={handleGetStarted}
            className="bg-[#1a2547] hover:bg-[#0f1629] text-white font-semibold text-base md:text-lg px-12 md:px-16 py-3 md:py-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-3xl"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

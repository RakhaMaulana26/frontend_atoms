import React from 'react';

interface InitialLoadingPageProps {
  message?: string;
}

/**
 * InitialLoadingPage - Full page loading screen
 * Displayed when the app is first loading or refreshing data
 */
const InitialLoadingPage: React.FC<InitialLoadingPageProps> = ({ 
  message = 'Preparing your workspace...' 
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#222E6A]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative flex flex-col items-center gap-4">
        {/* Double Ring Spinner Animation */}
        <div className="loadingio-spinner-double-ring">
          <div className="ldio-spinner">
            <div></div>
            <div></div>
            <div><div></div></div>
            <div><div></div></div>
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            AirNav Indonesia
          </h1>
          <p className="text-gray-500">{message}</p>
        </div>
      </div>

      {/* Custom CSS Animation */}
      <style>{`
        @keyframes ldio-spinner-rotate {
          0% { transform: rotate(0) }
          100% { transform: rotate(360deg) }
        }
        
        .ldio-spinner div { box-sizing: border-box!important }
        
        .ldio-spinner > div {
          position: absolute;
          width: 128px;
          height: 128px;
          top: 36px;
          left: 36px;
          border-radius: 50%;
          border: 8px solid #000;
          border-color: #222e6a transparent #222e6a transparent;
          animation: ldio-spinner-rotate 1s linear infinite;
        }

        .ldio-spinner > div:nth-child(2), 
        .ldio-spinner > div:nth-child(4) {
          width: 108px;
          height: 108px;
          top: 46px;
          left: 46px;
          animation: ldio-spinner-rotate 1s linear infinite reverse;
        }
        
        .ldio-spinner > div:nth-child(2) {
          border-color: transparent #454d7c transparent #454d7c
        }
        
        .ldio-spinner > div:nth-child(3) { border-color: transparent }
        
        .ldio-spinner > div:nth-child(3) div {
          position: absolute;
          width: 100%;
          height: 100%;
          transform: rotate(45deg);
        }
        
        .ldio-spinner > div:nth-child(3) div:before, 
        .ldio-spinner > div:nth-child(3) div:after { 
          content: "";
          display: block;
          position: absolute;
          width: 8px;
          height: 8px;
          top: -8px;
          left: 52px;
          background: #222e6a;
          border-radius: 50%;
          box-shadow: 0 120px 0 0 #222e6a;
        }
        
        .ldio-spinner > div:nth-child(3) div:after {
          left: -8px;
          top: 52px;
          box-shadow: 120px 0 0 0 #222e6a;
        }

        .ldio-spinner > div:nth-child(4) { border-color: transparent; }
        
        .ldio-spinner > div:nth-child(4) div {
          position: absolute;
          width: 100%;
          height: 100%;
          transform: rotate(45deg);
        }
        
        .ldio-spinner > div:nth-child(4) div:before, 
        .ldio-spinner > div:nth-child(4) div:after {
          content: "";
          display: block;
          position: absolute;
          width: 8px;
          height: 8px;
          top: -8px;
          left: 42px;
          background: #454d7c;
          border-radius: 50%;
          box-shadow: 0 100px 0 0 #454d7c;
        }
        
        .ldio-spinner > div:nth-child(4) div:after {
          left: -8px;
          top: 42px;
          box-shadow: 100px 0 0 0 #454d7c;
        }
        
        .loadingio-spinner-double-ring {
          width: 200px;
          height: 200px;
          display: inline-block;
          overflow: hidden;
          background: transparent;
        }
        
        .ldio-spinner {
          width: 100%;
          height: 100%;
          position: relative;
          transform: translateZ(0) scale(1);
          backface-visibility: hidden;
          transform-origin: 0 0;
        }
        
        .ldio-spinner div { box-sizing: content-box; }
      `}</style>
    </div>
  );
};

export default InitialLoadingPage;

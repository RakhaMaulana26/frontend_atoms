import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Twitter, 
  Facebook, 
  Instagram, 
  Linkedin,
  ArrowUp 
} from 'lucide-react';

const HomeFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-gradient-to-r from-[#454D7C] to-[#222E6A] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <img 
          src="/assets/image/image14.png" 
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-white text-xl font-bold">A</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">AIRNAV Management</h3>
                <p className="text-sm opacity-80">Integrated Aviation Solutions</p>
              </div>
            </div>
            <p className="text-sm opacity-90 leading-relaxed mb-6 max-w-md">
              Comprehensive aviation management system designed to streamline operations, 
              enhance safety protocols, and optimize resource allocation for modern aviation facilities.
            </p>
            <div className="flex items-center gap-4">
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <Facebook className="h-5 w-5" />
              </button>
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <Twitter className="h-5 w-5" />
              </button>
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <Instagram className="h-5 w-5" />
              </button>
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <Linkedin className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/roster')}
                className="block text-sm opacity-90 hover:opacity-100 hover:text-blue-300 transition-colors"
              >
                Personnel & Rostering
              </button>
              <button 
                onClick={() => navigate('/personnel')}
                className="block text-sm opacity-90 hover:opacity-100 hover:text-blue-300 transition-colors"
              >
                Employee Management
              </button>
              <button 
                onClick={() => navigate('/maintenance')}
                className="block text-sm opacity-90 hover:opacity-100 hover:text-blue-300 transition-colors"
              >
                Maintenance & Operation
              </button>
              <button 
                onClick={() => navigate('/inventory')}
                className="block text-sm opacity-90 hover:opacity-100 hover:text-blue-300 transition-colors"
              >
                Supply & Administration
              </button>
              <button 
                onClick={() => navigate('/support')}
                className="block text-sm opacity-90 hover:opacity-100 hover:text-blue-300 transition-colors"
              >
                Support Center
              </button>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 flex-shrink-0 opacity-80" />
                <span className="text-sm opacity-90">
                  Jakarta Aviation Hub<br />
                  Indonesia Aviation Authority
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 flex-shrink-0 opacity-80" />
                <span className="text-sm opacity-90">+62 21 xxxx-xxxx</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 flex-shrink-0 opacity-80" />
                <span className="text-sm opacity-90">info@airnav.co.id</span>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 flex-shrink-0 opacity-80" />
                <span className="text-sm opacity-90">www.airnav.co.id</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collaboration Section */}
        <div className="border-t border-white/10 py-8">
          <div className="text-center mb-6">
            <h4 className="text-lg font-semibold mb-2">In Collaboration With</h4>
            <p className="text-sm opacity-80">Supporting partnerships for aviation excellence</p>
          </div>
          <div className="flex items-center justify-center gap-8 md:gap-12">
            <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/15 transition-colors">
              <img 
                src="/assets/icon/logopens.svg" 
                alt="PENS Logo" 
                className="h-8 w-auto"
              />
              <span className="text-sm font-medium opacity-90">PENS</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/15 transition-colors">
              <img 
                src="/assets/icon/logougm.svg" 
                alt="UGM Logo" 
                className="h-8 w-auto"
              />
              <span className="text-sm font-medium opacity-90">UGM</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm opacity-80">
              © 2026 AIRNAV Management System. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <button 
                onClick={() => navigate('/privacy')}
                className="opacity-80 hover:opacity-100 hover:text-blue-300 transition-colors"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => navigate('/terms')}
                className="opacity-80 hover:opacity-100 hover:text-blue-300 transition-colors"
              >
                Terms of Service
              </button>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowUp className="h-4 w-4" />
                Top
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;

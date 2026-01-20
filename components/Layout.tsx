import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ScanEye, 
  Map as MapIcon, 
  ShieldAlert, 
  Activity, 
  Settings, 
  Menu,
  X,
  Radio,
  Camera,
  Cpu,
  Phone
} from 'lucide-react';
import Aiden from './Aiden';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/prediction', label: 'AI Prediction', icon: ScanEye },
    { path: '/map', label: 'Live Map', icon: MapIcon },
    { path: '/simulation', label: 'Digital Twin', icon: Activity },
    { path: '/emergency-plan', label: 'Planner', icon: ShieldAlert },
    { path: '/contacts', label: 'Contacts', icon: Phone },
    { path: '/ar-view', label: 'AR Scanner', icon: Camera },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  if (location.pathname === '/ar-view') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-100 selection:bg-cyan-500/30">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2 font-display text-lg tracking-wider">
          <ScanEye className="w-6 h-6 text-cyan-400" />
          <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">DISASTER<span className="text-cyan-400">EYE</span></span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-white">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`fixed md:sticky md:top-0 h-screen w-72 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800/50 p-6 transition-transform z-40 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.2)]`}
      >
        <div className="flex items-center gap-3 mb-10 px-2 group">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <ScanEye className="w-8 h-8 text-cyan-400 relative z-10" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-wider text-white">
              DISASTER<span className="text-cyan-400">EYE</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Response System v1.0</p>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-300 group relative overflow-hidden
                  ${isActive 
                    ? 'text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                )}
                <Icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className={`font-medium tracking-wide ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                
                {isActive && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)] animate-pulse"></div>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-slate-800/50 space-y-4">
           {/* System Status Widget */}
           <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400">CPU LOAD</span>
                <span className="text-xs font-mono text-emerald-400">12%</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full mb-3">
                 <div className="w-[12%] h-full bg-emerald-500 rounded-full"></div>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                System Online
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative h-screen">
        {/* Top Gradient Line */}
        <div className="sticky top-0 z-30 h-0.5 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]"></div>
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-32">
          {children}
        </div>
        
        {/* Aiden - The AI Assistant */}
        <Aiden />
      </main>
    </div>
  );
};

export default Layout;
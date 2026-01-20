import React, { useEffect, useState } from 'react';
import { ScanEye, Activity, ShieldCheck, Globe, Wifi } from 'lucide-react';

const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("INITIALIZING KERNEL...");
  const [activeIcon, setActiveIcon] = useState(0);

  useEffect(() => {
    // Total duration 5000ms, update every 50ms -> 100 steps
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 20) {
      setMessage("ESTABLISHING SECURE CONNECTION...");
      setActiveIcon(0);
    } else if (progress < 45) {
      setMessage("CALIBRATING GEOSPATIAL SENSORS...");
      setActiveIcon(1);
    } else if (progress < 70) {
      setMessage("ANALYZING REGIONAL RISK FACTORS...");
      setActiveIcon(2);
    } else if (progress < 90) {
      setMessage("SYNCING EMERGENCY PROTOCOLS...");
      setActiveIcon(3);
    } else {
      setMessage("SYSTEM READY.");
      setActiveIcon(4);
    }
  }, [progress]);

  const icons = [
    <Wifi key={0} size={24} className="animate-pulse text-blue-500" />,
    <Globe key={1} size={24} className="animate-spin-slow text-emerald-500" />,
    <Activity key={2} size={24} className="animate-bounce text-orange-500" />,
    <ShieldCheck key={3} size={24} className="text-purple-500" />,
    <ScanEye key={4} size={24} className="text-red-500" />
  ];

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[100]">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-900/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/0 via-slate-950 to-slate-950"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Animation */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
          <div className="relative bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <ScanEye size={64} className="text-red-500" />
          </div>
          
          {/* Orbiting particles */}
          <div className="absolute inset-0 animate-spin-slow duration-700">
             <div className="absolute -top-2 left-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
          </div>
          <div className="absolute inset-0 animate-spin-reverse-slow duration-1000">
             <div className="absolute -bottom-2 left-1/2 w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
          </div>
        </div>
        
        <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">
          Disaster<span className="text-red-600">Eye</span>
        </h1>
        <p className="text-slate-500 text-sm tracking-[0.3em] font-semibold mb-12 uppercase">
          AI Emergency Response System
        </p>

        {/* Progress Bar Container */}
        <div className="w-80 space-y-2">
            <div className="flex justify-between items-center h-6">
                <span className="text-xs font-mono text-slate-400">{message}</span>
                <span className="text-xs font-mono text-red-500 font-bold">{progress}%</span>
            </div>
            
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600 transition-all duration-75 ease-out shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                  style={{ width: `${progress}%` }}
                />
            </div>
        </div>

        {/* Status Icons */}
        <div className="mt-8 flex gap-4 h-8 items-center opacity-80">
            {icons.map((icon, idx) => (
                <div key={idx} className={`transition-all duration-500 ${idx === activeIcon ? 'opacity-100 scale-110' : 'opacity-20 scale-90 grayscale'}`}>
                    {icon}
                </div>
            ))}
        </div>
      </div>
      
      <div className="absolute bottom-8 text-slate-600 text-[10px] font-mono">
        SECURE CONNECTION // ENCRYPTED // V1.0.0
      </div>
    </div>
  );
};

export default SplashScreen;
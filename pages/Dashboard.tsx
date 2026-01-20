import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  AlertTriangle, TrendingUp, Users, ShieldCheck, Activity, Radio, Clock, 
  CloudRain, Wind, Droplets, Zap, Plane, Lock, Wifi, Cpu, Bell, CheckCircle
} from 'lucide-react';
import { RiskLevel, Alert } from '../types';
import { api } from '../services/storage';
import NewsFeed from '../components/NewsFeed';

const Dashboard: React.FC = () => {
  // Mock Data
  const riskData = [
    { time: '00:00', risk: 20 },
    { time: '04:00', risk: 25 },
    { time: '08:00', risk: 45 },
    { time: '12:00', risk: 75 },
    { time: '16:00', risk: 60 },
    { time: '20:00', risk: 40 },
  ];

  const resourceData = [
    { name: 'Water', amount: 80 },
    { name: 'Food', amount: 65 },
    { name: 'Meds', amount: 45 },
    { name: 'Fuel', amount: 90 },
  ];

  // State
  const [alertLevel, setAlertLevel] = useState<RiskLevel>(RiskLevel.MODERATE);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Action States
  const [droneStatus, setDroneStatus] = useState<'IDLE' | 'DEPLOYING' | 'ACTIVE'>('IDLE');
  const [lockdown, setLockdown] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const alertsData = await api.getAlerts();
        setAlerts(alertsData);
        if (alertsData.some(a => a.level === RiskLevel.CRITICAL)) setAlertLevel(RiskLevel.CRITICAL);
        else if (alertsData.some(a => a.level === RiskLevel.HIGH)) setAlertLevel(RiskLevel.HIGH);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  // Handlers
  const handleDeployDrones = () => {
    if (droneStatus !== 'IDLE') return;
    setDroneStatus('DEPLOYING');
    setTimeout(() => setDroneStatus('ACTIVE'), 2000);
  };

  const handleBroadcast = () => {
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  // Helper for alert colors
  const getAlertColor = (level: RiskLevel) => {
      switch(level) {
          case RiskLevel.CRITICAL: return 'text-red-500 border-red-500/50 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
          case RiskLevel.HIGH: return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
          case RiskLevel.MODERATE: return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
          default: return 'text-slate-400 border-slate-500/50 bg-slate-500/10';
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
            <h1 className="text-4xl font-display font-bold text-white tracking-wide mb-1">MISSION CONTROL</h1>
            <div className="flex items-center gap-4 text-slate-400 font-mono text-sm">
                <span className="flex items-center gap-2 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    SYSTEM ONLINE
                </span>
                <span>SECTOR: ALPHA-1</span>
            </div>
        </div>
        <div className="font-mono text-xs text-slate-400 text-right flex flex-col gap-1">
            <p className="text-xl font-bold text-white">{currentTime.toLocaleTimeString()}</p>
            <p>{currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      {/* Row 1: Key Metrics & Environment */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Threat Level */}
        <div className={`p-5 rounded-2xl border backdrop-blur-md relative overflow-hidden group transition-all duration-300 ${getAlertColor(alertLevel)}`}>
          <div className="absolute -right-6 -top-6 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
            <AlertTriangle size={120} />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
                <p className="text-xs font-bold tracking-widest uppercase opacity-80 mb-1">DEFCON Status</p>
                <h3 className="text-3xl font-display font-bold tracking-wider">{alertLevel}</h3>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-mono opacity-80">
                <Activity size={14} />
                <span>Trending Up (+12%)</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Environment Sensor */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-md flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <CloudRain size={48} className="text-blue-400" />
            </div>
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Env. Sensors</p>
                <div className="flex items-end gap-2">
                    <span className="text-4xl font-display font-bold text-white">24°C</span>
                    <span className="text-sm text-slate-400 mb-1">Partly Cloudy</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 p-1.5 rounded">
                    <Wind size={12} className="text-cyan-400" /> 45 km/h
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 p-1.5 rounded">
                    <Droplets size={12} className="text-blue-400" /> 68% Hum
                </div>
            </div>
        </div>

        {/* Metric 3: Active Units */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Response Units</p>
              <h3 className="text-3xl font-display font-bold text-white group-hover:text-cyan-400 transition-colors">14</h3>
              <p className="text-xs text-cyan-400 mt-2 flex items-center gap-1">
                 <Radio size={12} /> 3 Teams En Route
              </p>
            </div>
            <div className="absolute bottom-0 right-0 w-full h-1 bg-slate-800">
                <div className="h-full bg-cyan-500 w-[70%]"></div>
            </div>
        </div>

        {/* Metric 4: System Health */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-md relative overflow-hidden hover:border-emerald-500/30 transition-colors">
             <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Network Health</p>
              <h3 className="text-3xl font-display font-bold text-white">98.2%</h3>
              <div className="grid grid-cols-2 gap-2 mt-3">
                 <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Cpu size={10} /> CPU: 12%
                 </div>
                 <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Wifi size={10} /> Latency: 24ms
                 </div>
              </div>
            </div>
            <div className="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Row 2: Charts & Tactical Command */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[400px]">
        
        {/* Charts Container */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Risk Trend */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-xl shadow-lg flex flex-col">
            <h3 className="text-sm font-display font-bold mb-4 text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-red-500" />
                RISK PROJECTION
            </h3>
            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskData}>
                    <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" tick={{fontSize: 10}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 10}} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} 
                    itemStyle={{ color: '#ef4444' }}
                    />
                    <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" />
                </AreaChart>
                </ResponsiveContainer>
            </div>
            </div>

            {/* Resource Allocation */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-xl shadow-lg flex flex-col">
            <h3 className="text-sm font-display font-bold mb-4 text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-500" />
                SUPPLY CHAIN
            </h3>
            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resourceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 10}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 10}} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip 
                    cursor={{fill: '#334155', opacity: 0.2}}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                        {resourceData.map((entry, index) => (
                            <cell key={`cell-${index}`} fill={entry.amount < 50 ? '#ef4444' : '#3b82f6'} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>
        </div>

        {/* Tactical Command Panel */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700 backdrop-blur-xl shadow-lg flex flex-col gap-4">
             <div className="flex items-center gap-2 mb-2">
                 <Zap className="text-yellow-400" size={20} />
                 <h3 className="font-display font-bold text-white tracking-wide">TACTICAL COMMAND</h3>
             </div>
             
             {/* Action 1: Drones */}
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
                 <div className="flex justify-between items-start">
                     <div>
                         <p className="text-sm font-bold text-white">Aerial Surveillance</p>
                         <p className="text-[10px] text-slate-400">Deploy autonomous drone swarm to Sector 4.</p>
                     </div>
                     <Plane size={18} className="text-cyan-400" />
                 </div>
                 <button 
                    onClick={handleDeployDrones}
                    disabled={droneStatus !== 'IDLE'}
                    className={`
                        py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2
                        ${droneStatus === 'ACTIVE' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                            : droneStatus === 'DEPLOYING'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20'}
                    `}
                 >
                     {droneStatus === 'ACTIVE' ? 'UNITS ACTIVE' : droneStatus === 'DEPLOYING' ? 'DEPLOYING...' : 'LAUNCH DRONES'}
                 </button>
             </div>

             {/* Action 2: Lockdown */}
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
                 <div className="flex justify-between items-start">
                     <div>
                         <p className="text-sm font-bold text-white">Grid Lockdown</p>
                         <p className="text-[10px] text-slate-400">Restrict traffic signals and transit lines.</p>
                     </div>
                     <Lock size={18} className="text-red-400" />
                 </div>
                 <button 
                    onClick={() => setLockdown(!lockdown)}
                    className={`
                        py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2
                        ${lockdown
                            ? 'bg-red-500 text-white shadow-lg shadow-red-900/50 animate-pulse' 
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}
                    `}
                 >
                     {lockdown ? 'LOCKDOWN ACTIVE' : 'INITIATE LOCKDOWN'}
                 </button>
             </div>

             {/* Action 3: Broadcast */}
             <button 
                onClick={handleBroadcast}
                className={`
                    mt-auto py-4 rounded-xl border-2 border-dashed font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2
                    ${broadcastSent 
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' 
                        : 'border-slate-600 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}
                `}
             >
                 {broadcastSent ? <CheckCircle size={16} /> : <Bell size={16} />}
                 {broadcastSent ? 'ALERT BROADCASTED' : 'BROADCAST ALERT'}
             </button>
        </div>
      </div>

      {/* Row 3: Live Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Alerts Feed */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl shadow-lg flex flex-col h-[450px]">
          <h3 className="text-lg font-display font-bold mb-6 text-white flex items-center gap-2">
             <AlertTriangle className="text-orange-500" size={20} />
             LIVE ALERT FEED
          </h3>
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {isLoading ? (
                <div className="flex justify-center p-4"><div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin"></div></div>
            ) : alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700 group-hover:bg-cyan-500 transition-colors rounded-l-lg"></div>
                    <div className="ml-1 p-4 bg-slate-800/50 rounded-r-lg border border-slate-700/50 hover:bg-slate-800 transition-all hover:translate-x-1">
                        <div className="flex justify-between items-start mb-1">
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                 alert.level === RiskLevel.CRITICAL 
                                     ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                                     : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                             }`}>
                               {alert.level} PRIORITY
                             </span>
                             <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                <Clock size={10} /> {new Date(alert.timestamp).toLocaleTimeString()}
                             </span>
                        </div>
                        <p className="text-sm font-medium text-slate-200 leading-snug">{alert.message}</p>
                    </div>
                  </div>
                ))
            ) : (
                <p className="text-slate-500 text-center text-sm py-4">No active alerts. Systems normal.</p>
            )}
          </div>
        </div>

        {/* Global Disaster News (Integrated from previous step) */}
        <NewsFeed />
      
      </div>
    </div>
  );
};

export default Dashboard;
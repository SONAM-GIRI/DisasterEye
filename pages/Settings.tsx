import React, { useState } from 'react';
import { Bell, Shield, User, Save, Check, Smartphone, Mail, AlertTriangle, Eye, Globe } from 'lucide-react';

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [notifState, setNotifState] = useState({
    push: true,
    email: true,
    sms: false,
    critical: true
  });

  const [privacyState, setPrivacyState] = useState({
    location: true,
    analytics: false,
    publicProfile: false
  });

  const [displayState, setDisplayState] = useState({
    highContrast: false,
    reducedMotion: false
  });

  const handleSave = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    color?: string;
  }

  const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, description, icon, color = 'bg-blue-600' }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-700/50 last:border-0 group">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1 text-slate-400 group-hover:text-slate-200 transition-colors">{icon}</div>}
        <div>
          <p className="text-slate-200 font-medium">{label}</p>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <button 
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500/50 ${checked ? color : 'bg-slate-700'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Settings</h1>
        <p className="text-slate-400">Manage your alerts, privacy preferences, and system configuration.</p>
      </header>
      
      {/* Account Card */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="p-6 flex items-center gap-5">
             <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-2xl font-bold text-white shadow-inner border-2 border-slate-700">
                EC
             </div>
             <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Emergency Coordinator</h2>
                        <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                            <User size={14} /> Unit: Alpha-1 <span className="text-slate-600">|</span> ID: #8892-A
                        </p>
                    </div>
                    <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        ACTIVE
                    </span>
                </div>
             </div>
        </div>
      </section>

      {/* Notifications */}
       <section className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-4">
            <Bell size={20} className="text-blue-400" />
            Alert Preferences
          </h3>
          <div className="space-y-1">
             <Toggle 
                label="Push Notifications" 
                icon={<Smartphone size={18} />}
                checked={notifState.push} 
                onChange={(v) => setNotifState({...notifState, push: v})} 
             />
             <Toggle 
                label="Email Reports" 
                description="Daily summaries and incident logs"
                icon={<Mail size={18} />}
                checked={notifState.email} 
                onChange={(v) => setNotifState({...notifState, email: v})} 
             />
             <Toggle 
                label="Critical Alert Override" 
                description="Play sound even if device is in Do Not Disturb mode"
                icon={<AlertTriangle size={18} />}
                color="bg-red-500"
                checked={notifState.critical} 
                onChange={(v) => setNotifState({...notifState, critical: v})} 
             />
          </div>
       </section>

       {/* Privacy */}
       <section className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-4">
            <Shield size={20} className="text-emerald-400" />
            Privacy & Data
          </h3>
          <div className="space-y-1">
             <Toggle 
                label="Real-time Location Sharing" 
                description="Required for precise local risk assessment and evacuation routing"
                icon={<Globe size={18} />}
                checked={privacyState.location} 
                onChange={(v) => setPrivacyState({...privacyState, location: v})} 
             />
             <Toggle 
                label="Public Profile Visibility" 
                description="Allow other emergency responders to see your status"
                icon={<User size={18} />}
                checked={privacyState.publicProfile} 
                onChange={(v) => setPrivacyState({...privacyState, publicProfile: v})} 
             />
          </div>
       </section>

       {/* Display */}
       <section className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-4">
            <Eye size={20} className="text-purple-400" />
            Accessibility & Display
          </h3>
          <div className="space-y-1">
             <Toggle 
                label="High Contrast Mode" 
                checked={displayState.highContrast} 
                onChange={(v) => setDisplayState({...displayState, highContrast: v})} 
             />
             <Toggle 
                label="Reduced Motion" 
                description="Disable animations for map layers and alerts"
                checked={displayState.reducedMotion} 
                onChange={(v) => setDisplayState({...displayState, reducedMotion: v})} 
             />
          </div>
       </section>

       {/* Save Button */}
       <div className="flex justify-end pt-4 sticky bottom-6 z-10">
            <div className="bg-slate-900/80 backdrop-blur p-2 rounded-xl border border-slate-700 shadow-2xl">
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className={`
                        flex items-center gap-2 px-8 py-3 rounded-lg font-bold transition-all shadow-lg
                        ${success 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'}
                        ${loading ? 'opacity-80 cursor-wait' : ''}
                    `}
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : success ? (
                        <Check size={20} />
                    ) : (
                        <Save size={20} />
                    )}
                    {success ? 'Changes Saved' : 'Save Changes'}
                </button>
            </div>
       </div>
    </div>
  );
};

export default Settings;
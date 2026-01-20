import React, { useEffect, useRef, useState } from 'react';
import { Camera, AlertTriangle, ArrowUp, Navigation, XCircle, ChevronRight, Info, AlertOctagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ARView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [activeObject, setActiveObject] = useState<'FLOOD' | 'SAFE_ZONE' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Access camera
    const startCamera = async () => {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera API not supported in this browser.");
        return;
      }

      try {
        // Try getting the environment camera first
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'environment' } 
          });
        } catch (err) {
          console.warn("Environment camera not found, trying default user camera...", err);
          // Fallback to any available camera (often webcam on laptop)
          stream = await navigator.mediaDevices.getUserMedia({ 
              video: true 
          });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video plays (sometimes required on mobile)
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Video play failed", e));
          };
          setPermissionGranted(true);
        }
      } catch (err) {
        console.error("Camera access denied", err);
        setPermissionGranted(false);
        setError("Camera access denied. Please check your permissions or device capabilities.");
      }
    };

    startCamera();

    // Mock Scanning effect timeout
    const timer = setTimeout(() => setScanning(false), 3000);

    return () => {
      clearTimeout(timer);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const handleObjectTap = (type: 'FLOOD' | 'SAFE_ZONE') => {
    setActiveObject(type);
  };

  const handleAction = () => {
      if (activeObject === 'SAFE_ZONE') {
          navigate('/map');
      } else if (activeObject === 'FLOOD') {
          navigate('/emergency-plan');
      }
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 p-4 rounded-full mb-4">
          <AlertOctagon size={48} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Camera Unavailable</h2>
        <p className="text-slate-400 mb-6 max-w-xs">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-bold transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Camera Feed */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
         {/* Top Header */}
         <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pt-8 pb-12">
            <div className="pointer-events-auto">
                <button onClick={() => navigate('/')} className="text-white bg-slate-900/50 p-2 rounded-full backdrop-blur border border-white/10">
                    <XCircle />
                </button>
            </div>
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 bg-red-600/80 backdrop-blur px-3 py-1 rounded-full border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Hazard Detection Active</span>
                </div>
                <div className="mt-2 font-mono text-green-400 text-xs">
                    GPS: 34.0522° N, 118.2437° W
                </div>
            </div>
         </div>

         {/* Scanning Reticle */}
         {scanning && permissionGranted && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-blue-400/50 rounded-lg flex items-center justify-center">
                <div className="absolute inset-0 border-t-2 border-l-2 border-blue-400 w-4 h-4 -top-1 -left-1"></div>
                <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400 w-4 h-4 -top-1 -right-1"></div>
                <div className="absolute inset-0 border-b-2 border-l-2 border-blue-400 w-4 h-4 -bottom-1 -left-1"></div>
                <div className="absolute inset-0 border-b-2 border-r-2 border-blue-400 w-4 h-4 -bottom-1 -right-1"></div>
                <div className="w-full h-0.5 bg-blue-500/50 absolute top-1/2 animate-pulse"></div>
                <p className="mt-72 text-blue-400 font-mono text-sm animate-pulse">SCANNING TERRAIN...</p>
            </div>
         )}

         {/* AR Objects (Mocked) */}
         {!scanning && permissionGranted && (
            <>
                {/* Floating Hazard Label */}
                <div 
                    onClick={() => handleObjectTap('FLOOD')}
                    className="absolute top-1/3 left-1/4 transform -translate-x-1/2 animate-bounce duration-[2000ms] cursor-pointer pointer-events-auto group"
                >
                    <div className="flex flex-col items-center gap-2">
                        <AlertTriangle size={48} className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] group-hover:scale-110 transition-transform" />
                        <div className="bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg border border-red-500/50 text-center group-hover:bg-slate-800 transition-colors">
                            <p className="text-red-400 font-bold text-sm flex items-center gap-1 justify-center">FLOOD RISK HIGH <Info size={12}/></p>
                            <p className="text-white text-xs">Water Level +2m Predicted</p>
                        </div>
                        <div className="w-0.5 h-16 bg-gradient-to-b from-red-500 to-transparent"></div>
                    </div>
                </div>

                {/* Evacuation Route Arrow */}
                <div 
                    onClick={() => handleObjectTap('SAFE_ZONE')}
                    className="absolute bottom-1/3 right-1/4 transform translate-x-1/2 cursor-pointer pointer-events-auto group"
                >
                    <div className="flex flex-col items-center gap-2 opacity-90">
                        <div className="bg-emerald-900/80 backdrop-blur px-3 py-2 rounded-lg border border-emerald-500/50 text-center group-hover:bg-emerald-900 transition-colors">
                            <p className="text-emerald-400 font-bold text-sm flex items-center gap-1 justify-center">SAFE ZONE <Info size={12}/></p>
                            <p className="text-white text-xs">2.4km North</p>
                        </div>
                        <ArrowUp size={64} className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse group-hover:scale-110 transition-transform" />
                    </div>
                </div>
            </>
         )}

         {/* Detail Modal */}
         {activeObject && (
             <div className="absolute bottom-24 left-4 right-4 bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-4 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 pointer-events-auto z-50">
                 <div className="flex justify-between items-start mb-2">
                     <h3 className={`text-lg font-bold ${activeObject === 'FLOOD' ? 'text-red-500' : 'text-emerald-500'}`}>
                         {activeObject === 'FLOOD' ? 'CRITICAL FLOOD RISK' : 'DESIGNATED SAFE ZONE'}
                     </h3>
                     <button onClick={() => setActiveObject(null)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-1"><XCircle size={20}/></button>
                 </div>
                 <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                     {activeObject === 'FLOOD' 
                        ? 'AI Analysis indicates a 95% probability of water levels exceeding 2m in this sector within the next 120 minutes. Structural integrity of nearby levees is compromised.' 
                        : 'Northside Community Center. Currently operating at 85% capacity. Medical supplies and food rations are available.'}
                 </p>
                 <button 
                    onClick={handleAction}
                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${activeObject === 'FLOOD' ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/50' : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/50'} text-white transition`}
                 >
                     {activeObject === 'FLOOD' ? 'View Emergency Plan' : 'Navigate to Shelter'}
                     <ChevronRight size={16} />
                 </button>
             </div>
         )}

         {/* Bottom Controls */}
         {!activeObject && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 pointer-events-auto">
                <button className="flex flex-col items-center gap-1 text-white opacity-80 hover:opacity-100 transition">
                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
                        <Navigation size={20} />
                    </div>
                    <span className="text-[10px] uppercase font-bold">Route</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-white opacity-100 scale-110 transition">
                    <div className="w-16 h-16 rounded-full bg-red-600 border-4 border-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.6)]">
                        <Camera size={28} />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-red-400">Analyze</span>
                </button>
            </div>
         )}
      </div>
    </div>
  );
};

export default ARView;
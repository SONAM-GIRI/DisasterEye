import React, { useState } from 'react';
import { Upload, Loader2, AlertTriangle, CheckCircle, Scan, Aperture, FileWarning, Terminal } from 'lucide-react';
import { analyzeDisasterImage } from '../services/geminiService';
import { PredictionResult, RiskLevel } from '../types';

const Prediction: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null); // Reset previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    
    setLoading(true);
    try {
      // Extract base64 part only
      const base64Data = image.split(',')[1];
      const data = await analyzeDisasterImage(base64Data);
      setResult(data);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.LOW: return 'text-emerald-400 border-emerald-500/30 from-emerald-500/20 to-emerald-900/10';
      case RiskLevel.MODERATE: return 'text-yellow-400 border-yellow-500/30 from-yellow-500/20 to-yellow-900/10';
      case RiskLevel.HIGH: return 'text-orange-500 border-orange-500/30 from-orange-500/20 to-orange-900/10';
      case RiskLevel.CRITICAL: return 'text-red-500 border-red-500/50 from-red-500/20 to-red-900/10 shadow-[0_0_30px_rgba(239,68,68,0.2)]';
      default: return 'text-slate-400 border-slate-700 from-slate-800 to-slate-900';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <header className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
             <Aperture className="w-8 h-8 text-cyan-400 animate-spin-slow" />
        </div>
        <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-wide">VISUAL ANALYSIS UNIT</h1>
            <p className="text-slate-400 font-mono text-sm">AI-Powered Risk Assessment Module v4.2</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
        {/* Upload Section */}
        <div className="flex flex-col gap-6 h-full">
          <div className={`
            flex-1 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all relative overflow-hidden group
            ${image ? 'border-cyan-500/50 bg-slate-900/80' : 'border-slate-700 bg-slate-900/40 hover:border-cyan-500/50 hover:bg-slate-900/60'}
          `}>
            
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-slate-600 group-hover:border-cyan-400 transition-colors"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-slate-600 group-hover:border-cyan-400 transition-colors"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-slate-600 group-hover:border-cyan-400 transition-colors"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-slate-600 group-hover:border-cyan-400 transition-colors"></div>

            {image ? (
              <>
                <div className="absolute inset-0 z-0">
                    <img src={image} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay"></div>
                </div>
                {loading && (
                    <div className="absolute inset-0 z-10 bg-slate-950/80 flex flex-col items-center justify-center">
                        <Scan className="w-16 h-16 text-cyan-400 animate-pulse mb-4" />
                        <p className="font-mono text-cyan-400 tracking-widest animate-pulse">SCANNING...</p>
                    </div>
                )}
                <div className="relative z-10 bg-slate-950/80 px-4 py-2 rounded-lg backdrop-blur border border-slate-700">
                    <p className="text-xs font-mono text-slate-300">IMAGE LOADED</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-black/50">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-200 mb-2">Drop Sector Imagery</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">Upload surveillance photos, drone footage frames, or field captures for instant threat analysis.</p>
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!image || loading}
            className={`
              py-5 rounded-xl font-bold text-lg tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-3
              ${!image || loading 
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' 
                : 'bg-cyan-600 hover:bg-cyan-500 text-white hover:shadow-[0_0_20px_rgba(8,145,178,0.5)] border border-cyan-400'}
            `}
          >
            {loading ? <Loader2 className="animate-spin" /> : <ScanButtonIcon />}
            {loading ? 'PROCESSING DATA...' : 'INITIATE SCAN'}
          </button>
        </div>

        {/* Results Section */}
        <div className="h-full bg-slate-950/50 rounded-2xl border border-slate-800 p-1 overflow-hidden relative">
           <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>
           
           {!result && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <Terminal className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-mono text-sm tracking-wider">AWAITING INPUT STREAM...</p>
            </div>
          )}

          {loading && (
             <div className="h-full p-6 font-mono text-xs text-cyan-500/70 space-y-1">
                 <p>> Initializing neural layers...</p>
                 <p className="delay-75">> Connecting to hazard database...</p>
                 <p className="delay-150">> Identifying structural patterns...</p>
                 <p className="delay-300">> Calculating probability vectors...</p>
                 <div className="mt-4 w-full h-64 bg-slate-900/50 border border-slate-800 rounded relative overflow-hidden">
                     <div className="absolute top-0 left-0 h-full w-1 bg-cyan-500 animate-[gridFlow_2s_linear_infinite]"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                         <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                     </div>
                 </div>
             </div>
          )}

          {result && (
            <div className="h-full flex flex-col bg-slate-900/80 rounded-xl overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
              <div className={`p-6 border-b bg-gradient-to-r flex justify-between items-center ${getRiskColor(result.riskLevel)}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                      <FileWarning size={18} />
                      <h2 className="text-xl font-display font-bold uppercase tracking-wide">{result.disasterType}</h2>
                  </div>
                  <p className="text-xs font-mono opacity-80 uppercase tracking-widest">Confidence Index: {(result.confidence * 100).toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase opacity-70 block mb-1">Threat Level</span>
                  <span className="font-display font-black text-3xl tracking-tighter">{result.riskLevel}</span>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                  <h3 className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span> Analysis Summary
                  </h3>
                  <p className="text-slate-200 leading-relaxed text-sm">{result.summary}</p>
                </div>

                <div>
                  <h3 className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-3">Impact Radius</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Zone Size</p>
                      <p className="text-2xl font-display text-cyan-400">{result.estimatedImpact.radiusKm} <span className="text-sm font-sans text-slate-500">km</span></p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Est. Casualties</p>
                      <p className="text-2xl font-display text-purple-400">{result.estimatedImpact.peopleAffected}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-red-400 text-xs font-mono uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} /> Recommended Protocols
                  </h3>
                  <ul className="space-y-2">
                    {result.immediateActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-300 bg-slate-800/30 p-3 rounded border-l-2 border-red-500/50 hover:bg-slate-800 transition-colors">
                        <CheckCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ScanButtonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
)

export default Prediction;
import React, { useState } from 'react';
import { generateEmergencyPlanText } from '../services/geminiService';
import { FileText, Download, PlayCircle, Loader2 } from 'lucide-react';

const EmergencyPlan: React.FC = () => {
  const [context, setContext] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleGenerate = async () => {
    if (!context) return;
    setLoading(true);
    const text = await generateEmergencyPlanText(context);
    setPlan(text);
    setLoading(false);
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(plan);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">AI Emergency Planner</h1>
        <p className="text-slate-400">Generate a custom evacuation and resource plan for your specific situation.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <label className="block text-slate-300 font-semibold mb-2">Describe your situation</label>
            <textarea
              className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="E.g., I live in a 2-story house in a flood-prone area with my elderly mother and a dog. We have a car but the roads might be blocked."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            ></textarea>
            <button
              onClick={handleGenerate}
              disabled={loading || !context}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
            >
              {loading ? <Loader2 className="animate-spin" /> : <FileText />}
              Generate Plan
            </button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 h-[500px] overflow-y-auto relative">
          {!plan && !loading && (
             <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <FileText size={48} className="mb-4 opacity-50" />
                <p>Your AI-generated plan will appear here.</p>
             </div>
          )}
          
          {loading && (
             <div className="h-full flex flex-col items-center justify-center text-blue-400 animate-pulse">
                <p>Consulting emergency database...</p>
             </div>
          )}

          {plan && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-4 sticky top-0 bg-slate-900 z-10">
                <h3 className="text-xl font-bold text-white">Action Plan</h3>
                <div className="flex gap-2">
                   <button 
                    onClick={handleSpeak}
                    className={`p-2 rounded-full ${isSpeaking ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                   >
                     <PlayCircle />
                   </button>
                   <button className="p-2 rounded-full bg-emerald-600 text-white">
                     <Download />
                   </button>
                </div>
              </div>
              <div className="prose prose-invert prose-slate max-w-none">
                {plan.split('\n').map((line, i) => (
                  <p key={i} className="text-slate-300 mb-2">{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyPlan;

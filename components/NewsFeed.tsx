import React, { useEffect, useState } from 'react';
import { Newspaper, RefreshCw, Radio } from 'lucide-react';
import { NewsItem } from '../types';
import { api } from '../services/storage';
import { fetchRealTimeNews } from '../services/geminiService';

const NewsFeed: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);

    const fetchNews = async () => {
        setIsLoading(true);
        try {
            // Attempt to fetch real-time news first
            const liveNews = await fetchRealTimeNews();
            
            if (liveNews.length > 0) {
                setNews(liveNews);
                setIsLive(true);
            } else {
                // Fallback to mock data
                const mockNews = await api.getNews();
                setNews(mockNews);
                setIsLive(false);
            }
        } catch (error) {
            console.error("Feed error", error);
            // Fallback
            const mockNews = await api.getNews();
            setNews(mockNews);
            setIsLive(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    return (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl shadow-lg flex flex-col h-[450px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                    <Newspaper className="text-cyan-400" size={20} />
                    GLOBAL INTEL
                </h3>
                <div className="flex items-center gap-2">
                    {isLive && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-bold text-red-400 animate-pulse">
                            <Radio size={10} /> LIVE
                        </div>
                    )}
                    <button 
                        onClick={fetchNews} 
                        disabled={isLoading}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Refresh Feed"
                    >
                        <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                        <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin"></div>
                        <p className="text-xs font-mono animate-pulse">Scanning Global Networks...</p>
                    </div>
                ) : news.length > 0 ? (
                    news.map((item) => (
                        <a 
                            key={item.id} 
                            href={item.url || '#'} 
                            target={item.url ? "_blank" : undefined}
                            rel="noreferrer"
                            className="group flex gap-4 p-4 rounded-xl hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700 cursor-pointer hover:shadow-lg block"
                        >
                            {item.imageUrl && (
                                <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-900 relative hidden sm:block">
                                    <div className="absolute inset-0 bg-cyan-500/20 mix-blend-overlay group-hover:opacity-0 transition-opacity"></div>
                                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-2 leading-tight mb-2 font-display">
                                        {item.title}
                                    </h4>
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                        {item.summary}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 border-t border-slate-800/50 pt-2">
                                    <span className="font-bold text-cyan-500/80 uppercase tracking-wider truncate max-w-[150px]">{item.source}</span>
                                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </a>
                    ))
                ) : (
                    <p className="text-slate-500 text-center text-sm py-4">Intel feed offline.</p>
                )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-700/50 text-center">
                <span className="text-[10px] text-slate-600 font-mono">
                    POWERED BY GEMINI SEARCH GROUNDING
                </span>
            </div>
        </div>
    );
};

export default NewsFeed;
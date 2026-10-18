
import * as React from 'react';
import { useState, useEffect } from 'react';

interface RSSItem {
  title: string;
  link: string;
  source: string;
}

const FALLBACK_INTEL: RSSItem[] = [
  { title: "ALERT: Solar storm activity affecting Ku-band performance in Northern Europe.", link: "#", source: "LOCAL_INTEL" },
  { title: "INTEL: New firmware vulnerabilities discovered in legacy HughesNet modems.", link: "#", source: "SECURITY_DESK" },
  { title: "UPDATE: Eutelsat 10B enters regular commercial service at 10°E.", link: "#", source: "ORBITAL_OPS" },
  { title: "NOTICE: Global GPS constellation undergoing scheduled maintenance cycle.", link: "#", source: "NAV_SYSTEMS" },
  { title: "RESEARCH: Advances in Ka-band rain fade mitigation techniques.", link: "#", source: "RF_LABS" },
  { title: "TACTICAL: Possible uplink interference detected in Sector 7G.", link: "#", source: "FIELD_INTEL" },
  { title: "CYBER: APT Group targeting satellite teleport infrastructure reported.", link: "#", source: "THREAT_MONITOR" }
];

export const RSSReader: React.FC = () => {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      const targetUrl = 'https://spacenews.com/feed/';
      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
      ];

      for (const proxy of proxies) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const response = await fetch(proxy, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!response.ok) continue;
          
          let xmlText = '';
          if (proxy.includes('allorigins')) {
            const data = await response.json();
            xmlText = data.contents;
          } else {
            xmlText = await response.text();
          }

          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const channelItems = xmlDoc.querySelectorAll("item");
          
          if (channelItems.length > 0) {
            setItems(Array.from(channelItems).slice(0, 8).map(node => ({
              title: node.querySelector("title")?.textContent || 'Untitled Intelligence',
              link: node.querySelector("link")?.textContent || '#',
              source: 'SPACENEWS_LIVE'
            })));
            setUseFallback(false);
            setLoading(false);
            return; // Success!
          }
        } catch {
          // Fall through to next proxy or fallback cache
        }
      }

      // If all proxies fail or network is isolated, default to local tactical intelligence cache
      setItems(FALLBACK_INTEL);
      setUseFallback(true);
      setLoading(false);
    };

    fetchFeed();
  }, []);

  const handleDownloadRSS = () => {
    if (items.length === 0) return;
    const data = JSON.stringify({
      timestamp: new Date().toISOString(),
      source: useFallback ? 'LOCAL_CACHE' : 'LIVE_FEED_SPACENEWS',
      items: items
    }, null, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TACTICAL_INTEL_FEED_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass p-6 rounded-2xl border-slate-800 min-h-[500px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center">
          <span className="w-3 h-3 bg-cyan-500 rounded-full mr-3 animate-pulse"></span>
          Tactical Intel Feed
        </h2>
        <div className="flex items-center space-x-3">
          {items.length > 0 && (
            <button 
              onClick={handleDownloadRSS}
              className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all"
            >
              DOWNLOAD_INTEL_DATA
            </button>
          )}
          {useFallback && (
            <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">Local Cache Mode</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold animate-pulse">Synchronizing Multi-Proxy Uplink...</p>
          </div>
        ) : (
          items.map((item, i) => (
            <a 
              key={i} 
              href={item.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block p-4 rounded-xl border border-slate-800 bg-slate-950/30 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-[8px] font-bold text-cyan-500 mono uppercase tracking-[0.2em]">{item.source}</span>
                <svg className="w-3 h-3 text-slate-700 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-slate-300 leading-snug group-hover:text-white transition-colors">
                {item.title}
              </p>
            </a>
          ))
        )}
      </div>
      
      {!loading && (
        <div className="mt-8 pt-6 border-t border-slate-800/50 flex flex-col items-center text-center">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.4em] mb-2">Automated monitoring active for new intel</p>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
            <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
            <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
};


import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Packet {
    id: string;
    timestamp: string;
    src: string;
    dst: string;
    proto: string;
    payload: string;
    isInteresting: boolean;
}

const KEYWORDS = ['user', 'pass', 'login', 'post'];
const IPS = ['192.168.1.105', '10.0.0.42', '172.16.0.12', '8.8.8.8', '10.254.1.42'];

export const StealthSniffer: React.FC = () => {
    const [isSniffing, setIsSniffing] = useState(false);
    const [packets, setPackets] = useState<Packet[]>([
        {
            id: 'pkt-pre-1',
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            src: '10.254.1.42',
            dst: '172.16.0.12',
            proto: 'TCP/80',
            payload: 'HTTP/1.1 POST /api/auth?pass=e3cfvk&session_id=zvcqw3js',
            isInteresting: true
        },
        {
            id: 'pkt-pre-2',
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            src: '192.168.1.105',
            dst: '8.8.8.8',
            proto: 'TCP/80',
            payload: 'GET /index.html HTTP/1.1\nHost: example.com',
            isInteresting: false
        }
    ]);
    const [interestingCount, setInterestingCount] = useState(1);
    const logEndRef = useRef<HTMLDivElement>(null);

    const handleDownloadSniffedPackets = () => {
        if (packets.length === 0) return;
        const report = {
            timestamp: new Date().toISOString(),
            tool: "STEALTH_PACKET_SNIFFER",
            packet_count: packets.length,
            intercept_count: packets.filter(p => p.isInteresting).length,
            packets: packets
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `STEALTH_SNIFFER_PACKETS_${new Date().getTime()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const generatePacket = (): Packet => {
        const src = IPS[Math.floor(Math.random() * IPS.length)];
        const dst = IPS[Math.floor(Math.random() * IPS.length)];
        const isInteresting = Math.random() > 0.85;
        
        let payload = '';
        if (isInteresting) {
            if (Math.random() > 0.7) {
                return {
                    id: `pkt-intel-${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    src: '10.254.1.42',
                    dst: '172.16.0.12',
                    proto: 'TCP/80',
                    payload: 'HTTP/1.1 POST /api/auth?pass=e3cfvk&session_id=zvcqw3js',
                    isInteresting: true
                };
            }
            const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
            const randomData = Math.random().toString(36).substring(7);
            payload = `HTTP/1.1 POST /api/auth?${keyword}=${randomData}&session_id=${Math.random().toString(36).substring(2, 10)}`;
        } else {
            payload = `GET /index.html HTTP/1.1\nHost: example.com\nUser-Agent: Mozilla/5.0...`;
        }

        return {
            id: `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            src,
            dst,
            proto: 'TCP/80',
            payload,
            isInteresting
        };
    };

    useEffect(() => {
        let interval: number;
        if (isSniffing) {
            interval = window.setInterval(() => {
                const newPacket = generatePacket();
                setPackets(prev => [newPacket, ...prev].slice(0, 100));
                if (newPacket.isInteresting) {
                    setInterestingCount(c => c + 1);
                }
            }, 800 + Math.random() * 1200);
        }
        return () => clearInterval(interval);
    }, [isSniffing]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [packets]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px] animate-in fade-in duration-500">
            {/* Control Panel */}
            <div className="lg:col-span-3 space-y-6">
                <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/40">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Sniffer Configuration</h3>
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Target Port</span>
                            <span className="text-xs text-cyan-400 font-mono">TCP 80 (HTTP)</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Keywords</span>
                            <div className="flex flex-wrap gap-1">
                                {KEYWORDS.map(k => (
                                    <span key={k} className="text-[9px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">{k}</span>
                                ))}
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsSniffing(!isSniffing)}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95 ${
                                isSniffing 
                                ? 'bg-red-600/20 border border-red-500/50 text-red-500 hover:bg-red-600/30' 
                                : 'bg-cyan-600 text-slate-950 hover:bg-cyan-500 shadow-lg shadow-cyan-500/20'
                            }`}
                        >
                            {isSniffing ? 'STOP_SNIFFER' : 'START_STEALTH_SNIFFER'}
                        </button>
                    </div>
                </div>

                <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/40">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Session Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-black text-white">{packets.length}</div>
                            <div className="text-[8px] text-slate-500 uppercase font-bold">Packets</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-black text-red-500">{interestingCount}</div>
                            <div className="text-[8px] text-slate-500 uppercase font-bold">Intercepts</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terminal Output */}
            <div className="lg:col-span-9 glass rounded-3xl border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isSniffing ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">Stealth_Sniffer_v1.0.py</h3>
                    </div>
                    <div className="flex items-center space-x-3">
                        {packets.length > 0 && (
                            <button 
                                onClick={handleDownloadSniffedPackets}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                DOWNLOAD_PCAP
                            </button>
                        )}
                        <span className="text-[9px] font-mono text-slate-500">ROOT@SENTINEL:~# python3 sniffer.py</span>
                    </div>
                </div>
                
                <div className="flex-grow p-6 overflow-y-auto font-mono text-[11px] space-y-2 scrollbar-hide">
                    {!isSniffing && packets.length === 0 && (
                        <div className="text-slate-600 italic">--- Awaiting initialization ---</div>
                    )}
                    
                    {isSniffing && packets.length === 0 && (
                        <div className="text-cyan-500 animate-pulse">--- Starting Stealth Sniffer (Ctrl+C to stop) ---</div>
                    )}

                    <AnimatePresence initial={false}>
                        {packets.map((pkt) => (
                            <motion.div 
                                key={pkt.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`p-3 rounded-lg border ${
                                    pkt.isInteresting 
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                                    : 'bg-slate-900/40 border-slate-800/50 text-slate-400'
                                }`}
                            >
                                {pkt.isInteresting && (
                                    <div className="font-black mb-1 text-[10px] uppercase tracking-widest flex items-center">
                                        <span className="mr-2">⚠️</span> [!] Interesting Traffic Found on {pkt.dst}:
                                    </div>
                                )}
                                <div className="flex justify-between mb-1 opacity-60 text-[9px]">
                                    <span>[{pkt.timestamp}] {pkt.src} {'->'} {pkt.dst}</span>
                                    <span>{pkt.proto}</span>
                                </div>
                                <div className="break-all">
                                    {pkt.isInteresting ? `Details: ${pkt.payload}` : `Payload: ${pkt.payload.substring(0, 60)}...`}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={logEndRef} />
                </div>
            </div>
        </div>
    );
};

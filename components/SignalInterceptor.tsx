
import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { analyzeInterceptedSignal, generateDecryptedMessage } from '../services/geminiService.ts';

type ScanState = 'IDLE' | 'SCANNING' | 'INTERCEPTED' | 'ANALYZING' | 'ANALYZED' | 'DECRYPTING' | 'DECRYPTED';
const MODULATION_TYPES = ['QPSK', '8PSK', '16-QAM', 'BPSK', 'FHSS', 'OFDM'];

const getRandomFloat = (min: number, max: number, decimals: number) => {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
};

export const SignalInterceptor: React.FC<{ isJamming: boolean; jammingPower: number; isStealthMode: boolean; }> = ({ isJamming, jammingPower, isStealthMode }) => {
    const [scanState, setScanState] = useState<ScanState>('IDLE');
    const [signalParams, setSignalParams] = useState<any>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [decryptedMessage, setDecryptedMessage] = useState('');
    const [displayedMessage, setDisplayedMessage] = useState('');
    const visualizerRef = useRef<HTMLCanvasElement>(null);

    const resetState = () => {
        setScanState('IDLE');
        setSignalParams(null);
        setAnalysis(null);
        setDecryptedMessage('');
        setDisplayedMessage('');
    };

    const handleScan = () => {
        resetState();
        setScanState('SCANNING');
        setTimeout(() => {
            if (isStealthMode) { // If stealth mode is active, report no signals
                setSignalParams(null);
                setScanState('INTERCEPTED'); // Still change state to indicate scan completed
                setAnalysis({ probableOrigin: "NO_SIGNALS", suspectedPurpose: "NO_DETECTION", threatLevel: "NOMINAL", encryptionType: "N/A", suggestedKeyFragment: "N/A"});
            } else {
                setSignalParams({
                    frequency: getRandomFloat(10.5, 14.8, 3), // GHz
                    bandwidth: getRandomFloat(2, 72, 0), // MHz
                    modulation: MODULATION_TYPES[Math.floor(Math.random() * MODULATION_TYPES.length)],
                    snr: getRandomFloat(5, 25, 1),
                });
                setScanState('INTERCEPTED');
            }
        }, 4000); // 4 seconds scan simulation
    };

    const handleAnalyze = async () => {
        if (!signalParams && !isStealthMode) return;
        setScanState('ANALYZING');
        const analysisResult = await analyzeInterceptedSignal(signalParams);
        if (analysisResult) {
            setAnalysis(analysisResult);
            setScanState('ANALYZED');
        } else {
            // Handle error case
            setAnalysis({ error: "STIA analysis uplink failed." });
            setScanState('ANALYZED');
        }
    };
    
    const handleDecrypt = async () => {
        if(!analysis || analysis.error || isStealthMode) return; // Cannot decrypt if stealth mode is active (no signals)
        setScanState('DECRYPTING');
        const message = await generateDecryptedMessage(analysis);
        setDecryptedMessage(message || "// DECRYPTION FAILED //");
        setScanState('DECRYPTED');
    };

    useEffect(() => {
        let interval: number;
        if(scanState === 'DECRYPTED' && decryptedMessage) {
            let i = 0;
            const randomChars = 'AZERTYUIOPQSDFGHJKLMWXCVBN0123456789#@&?!$';
            interval = window.setInterval(() => {
                if (i >= decryptedMessage.length) {
                    clearInterval(interval);
                    return;
                }
                let newText = '';
                for(let j=0; j < decryptedMessage.length; j++) {
                    if (j <= i) {
                        newText += decryptedMessage[j];
                    } else {
                        newText += randomChars[Math.floor(Math.random() * randomChars.length)];
                    }
                }
                setDisplayedMessage(newText);
                i++;
            }, 50);
        }
        return () => clearInterval(interval);
    }, [scanState, decryptedMessage]);

    useEffect(() => {
        const canvas = visualizerRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let animationFrameId: number;
        let t = 0;

        const render = () => {
            t++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (scanState === 'SCANNING' || scanState === 'IDLE' || isStealthMode) { // Show clean scan in stealth mode
                if (!isStealthMode) {
                    const scanX = (t * 4) % canvas.width;
                    ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
                    ctx.fillRect(scanX, 0, 3, canvas.height);
                }

                for (let i = 0; i < 50; i++) {
                    const x = Math.random() * canvas.width;
                    const y = canvas.height * 0.8 + Math.random() * (canvas.height * 0.2);
                    const width = Math.random() * 2;
                    ctx.fillStyle = isStealthMode ? `rgba(168, 85, 247, ${Math.random() * 0.1})` : `rgba(51, 65, 85, ${Math.random() * 0.5})`; // Subtle stealth noise
                    ctx.fillRect(x, y, width, 1);
                }
            }
            
            if (['INTERCEPTED', 'ANALYZING', 'ANALYZED', 'DECRYPTING', 'DECRYPTED'].includes(scanState) && !isStealthMode) { // Only show signal if not in stealth mode
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                const vcenter = canvas.height / 2;
                const amplitude = canvas.height * 0.3;
                const noise = isJamming ? (jammingPower / 10) : 1;
                
                for (let x = 0; x < canvas.width; x++) {
                    const angle = (x / 50) + (t / 20);
                    const y = vcenter + Math.sin(angle) * Math.cos(angle * 0.5) * amplitude + (Math.random() - 0.5) * noise;
                    if(x === 0) ctx.moveTo(x,y);
                    else ctx.lineTo(x,y);
                }
                ctx.stroke();
            } else if (isStealthMode && (scanState === 'INTERCEPTED' || scanState === 'ANALYZED')) { // Visual for "no signal" in stealth
                 ctx.font = 'bold 16px JetBrains Mono';
                 ctx.fillStyle = '#a855f7';
                 ctx.textAlign = 'center';
                 ctx.fillText('NO_ANOMALY_DETECTED', canvas.width / 2, canvas.height / 2);
            }

            animationFrameId = requestAnimationFrame(render);
        };
        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [scanState, isJamming, jammingPower, isStealthMode]);

    const getThreatColor = (level?: string) => {
        if (!level) return 'text-slate-500';
        switch(level.toUpperCase()) {
            case 'NOMINAL': return 'text-cyan-400';
            case 'GUARDED': return 'text-amber-400';
            case 'ELEVATED': return 'text-orange-500';
            case 'SEVERE': return 'text-red-500';
            default: return 'text-slate-500';
        }
    };

    const handleDownloadData = () => {
        if (!signalParams && !analysis && !decryptedMessage) return;
        const data = `--- STIA SIGINT INTERCEPT REPORT ---\n` +
          `TIMESTAMP: ${new Date().toLocaleString()}\n` +
          `SECURITY POSTURE: ${isStealthMode ? 'STEALTH_ACTIVE_MUTED' : 'ACTIVE_MONITORING'}\n` +
          `-----------------------------------\n\n` +
          `SIGNAL METRICS:\n` +
          `- Frequency: ${signalParams?.frequency || 'N/A'} GHz\n` +
          `- Bandwidth: ${signalParams?.bandwidth || 'N/A'} MHz\n` +
          `- Modulation: ${signalParams?.modulation || 'N/A'}\n` +
          `- SNR: ${signalParams?.snr || 'N/A'} dB\n` +
          `-----------------------------------\n\n` +
          `STIA ASSESSMENT:\n` +
          `- Probable Origin: ${analysis?.probableOrigin || 'N/A'}\n` +
          `- Suspected Purpose: ${analysis?.suspectedPurpose || 'N/A'}\n` +
          `- Encryption Scheme: ${analysis?.encryptionType || 'N/A'}\n` +
          `- Threat Index: ${analysis?.threatLevel || 'N/A'}\n` +
          `- Extracted Key: ${analysis?.suggestedKeyFragment || 'N/A'}\n` +
          `-----------------------------------\n\n` +
          `DECRYPTED PAYLOAD:\n` +
          `"${decryptedMessage || 'N/A'}"\n\n` +
          `[EOF: SIGNAL INTERCEPT RECORD]`;

        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SIGINT_CAPTURE_${new Date().getTime()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
            {/* Left Panel */}
            <div className="lg:col-span-3 space-y-6">
                <div className="glass p-6 rounded-2xl border-slate-800">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">SIGINT Controls</h3>
                    <button onClick={handleScan} disabled={scanState !== 'IDLE'} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-slate-950 font-bold py-3 rounded-xl uppercase tracking-widest text-xs">
                       {scanState === 'SCANNING' ? 'SCANNING...' : 'SCAN FOR ANOMALOUS SIGNALS'}
                    </button>
                    {scanState !== 'IDLE' && scanState !== 'SCANNING' && (
                         <button onClick={resetState} className="w-full mt-3 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 font-bold py-2 rounded-xl uppercase tracking-widest text-xs">
                             Reset Scanner
                         </button>
                    )}
                </div>
                 {signalParams && !isStealthMode && ( /* Hide parameters if stealth mode is active */
                    <div className="glass p-6 rounded-2xl border-slate-800 animate-in fade-in">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Intercept Parameters</h3>
                        <div className="space-y-3 text-xs mono">
                            <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-500">FREQ:</span> <span className="text-cyan-400">{signalParams.frequency} GHz</span></div>
                            <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-500">BW:</span> <span className="text-cyan-400">{signalParams.bandwidth} MHz</span></div>
                            <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-500">MOD:</span> <span className="text-cyan-400">{signalParams.modulation}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">SNR:</span> <span className="text-cyan-400">{signalParams.snr} dB</span></div>
                        </div>
                    </div>
                 )}
                 {isStealthMode && (
                    <div className="glass p-6 rounded-2xl border-purple-500/50 animate-in fade-in">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400 mb-4">Stealth Protocol Status</h3>
                        <p className="text-xs mono text-slate-400">All external signal emissions suppressed. No anomalous activity detected.</p>
                    </div>
                 )}
            </div>

            {/* Center Panel */}
            <div className="lg:col-span-6 flex flex-col space-y-6">
                <div className="glass p-4 rounded-2xl border-slate-800 flex-grow flex flex-col">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-2">Live Spectrum Analysis</h3>
                   <div className="bg-slate-950 rounded-lg border border-slate-900 shadow-inner flex-grow">
                       <canvas ref={visualizerRef} className="w-full h-full min-h-[200px]" width="600" height="200"></canvas>
                   </div>
                </div>
                <div className="glass p-6 rounded-2xl border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">STIA Analysis & Decryption</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleAnalyze} disabled={(!signalParams && !isStealthMode) || scanState !== 'INTERCEPTED'} className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-slate-200 font-bold py-3 rounded-xl uppercase tracking-widest text-xs">
                           {scanState === 'ANALYZING' ? 'ANALYZING...' : 'ANALYZE WITH STIA'}
                        </button>
                        <button onClick={handleDecrypt} disabled={!analysis || analysis.error || scanState !== 'ANALYZED' || isStealthMode} className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-slate-200 font-bold py-3 rounded-xl uppercase tracking-widest text-xs">
                           {isStealthMode ? 'PROTOCOL ACTIVE' : (scanState === 'DECRYPTING' ? 'DECRYPTING...' : 'DECRYPT SIGNAL')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="lg:col-span-3 glass p-4 rounded-2xl border-slate-800 flex flex-col">
                <div className="flex items-center justify-between mb-3 px-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Intelligence Log</h3>
                    {(signalParams || analysis || decryptedMessage) && (
                        <button 
                            onClick={handleDownloadData} 
                            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded px-2 py-1 text-[8px] font-black uppercase tracking-widest transition-all"
                            title="Download Intercept Data"
                        >
                            EXPORT_INTEL
                        </button>
                    )}
                </div>
                <div className="flex-grow overflow-y-auto scrollbar-hide bg-slate-950/50 rounded-lg p-4 space-y-4">
                    {!analysis && <p className="text-xs text-slate-600 mono animate-pulse">Awaiting analysis...</p>}
                    {analysis && analysis.error && <p className="text-xs text-red-500 mono">{analysis.error}</p>}
                    {analysis && !analysis.error && !isStealthMode && ( /* Hide analysis if stealth mode is active and no signal was found */
                        <div className="text-xs mono space-y-3 animate-in fade-in">
                            <div><span className="text-slate-500 font-bold">ORIGIN:</span> <span className="text-slate-200">{analysis.probableOrigin}</span></div>
                            <div><span className="text-slate-500 font-bold">PURPOSE:</span> <span className="text-slate-200">{analysis.suspectedPurpose}</span></div>
                            <div><span className="text-slate-500 font-bold">ENCRYPTION:</span> <span className="text-slate-200">{analysis.encryptionType}</span></div>
                            <div><span className="text-slate-500 font-bold">THREAT LVL:</span> <span className={`font-bold ${getThreatColor(analysis.threatLevel)}`}>{analysis.threatLevel}</span></div>
                            <div><span className="text-slate-500 font-bold">KEY FRAGMENT:</span> <span className="text-amber-400">{analysis.suggestedKeyFragment}</span></div>
                        </div>
                    )}
                     {isStealthMode && (
                        <div className="text-xs mono space-y-3 animate-in fade-in">
                            <p className="text-purple-400">STEALTH_PROTOCOL_ACTIVE: No incoming transmissions detected. Operational security maintained.</p>
                        </div>
                    )}
                    
                    {(scanState === 'DECRYPTING' || scanState === 'DECRYPTED') && !isStealthMode && ( /* Hide decryption if stealth mode is active */
                        <div className="pt-4 border-t border-slate-800">
                             <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-2">Decrypted Transmission:</h4>
                             <p className="text-sm text-cyan-200 mono bg-cyan-500/5 p-3 rounded-md min-h-[80px]">
                                {displayedMessage}
                                {scanState === 'DECRYPTING' && <span className="animate-pulse">_</span>}
                             </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

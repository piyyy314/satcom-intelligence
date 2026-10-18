
import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { getTroubleshootingAdvice, transcribeAudio } from '../services/geminiService.ts';
import { TroubleshootingLog } from '../types.ts';

interface TelemetryData {
  snr: string;
  rxPower: string;
  bucTemp: string;
  packetLoss: string;
  status: string;
}

interface Props {
  context: any;
  telemetry: TelemetryData;
  isStealthMode: boolean;
  isNeuralCleaning: boolean;
  onToggleNeuralCleaning: () => void;
}

interface Overrides {
  snr: string | null;
  rxPower: string | null;
  bucTemp: string | null;
  packetLoss: string | null;
}

export const AITechnician: React.FC<Props> = ({ context, telemetry, isStealthMode, isNeuralCleaning, onToggleNeuralCleaning }) => {
  const [messages, setMessages] = useState<(TroubleshootingLog & { grounding?: any[] })[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{data: string, mimeType: string, url: string}[]>([]);
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>({
    snr: null,
    rxPower: null,
    bucTemp: null,
    packetLoss: null
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Int16Array[]>([]);

  useEffect(() => {
    const initialGreeting = { 
      role: 'assistant' as const, 
      content: `[SYSTEM_READY] STIA-Agent Active.\n${isStealthMode ? 'PROTOCOL: STEALTH_MODE_ACTIVE\n' : ''}INTELLIGENCE_POSTURE: ${isThinking ? 'MAX_THINK' : 'FAST_RESPONSE'}\nDEFCON: ${context.defcon || 5}\n\nAwaiting tactical directives. Grounding: ${useSearch ? 'LIVE_SEARCH_ACTIVE' : 'LOCAL_CACHE_ONLY'}.`, 
      timestamp: new Date() 
    };
    setMessages([initialGreeting]);
  }, [isStealthMode, context.defcon, isThinking]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleDownloadLog = () => {
    const header = `--- STIA SESSION LOG | ${new Date().toLocaleString()} ---\n` +
      `ASSET: ${context.satName || 'Unknown'}\n` +
      `ENVIRONMENT: ${JSON.stringify({ ...context, telemetry }, null, 2)}\n` +
      `--------------------------------------------------\n\n`;
    
    const body = messages.map(m => `[${m.timestamp.toLocaleTimeString()}] ${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    
    const blob = new Blob([header + body], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `STIA_SESSION_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    (Array.from(files) as File[]).forEach(file => {
      const reader = new FileReader();
      reader.onload = (rev) => {
        const base64 = (rev.target?.result as string).split(',')[1];
        setAttachedFiles(prev => [...prev, {
          data: base64,
          mimeType: file.type,
          url: URL.createObjectURL(file)
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      audioChunksRef.current = [];
      scriptProcessorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
        }
        audioChunksRef.current.push(pcm16);
      };

      source.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);
      setIsRecording(true);
    } catch (err) {
      console.error("MIC_ERROR", err);
    }
  };

  const stopRecording = async () => {
    if (!scriptProcessorRef.current) return;
    scriptProcessorRef.current.disconnect();
    setIsRecording(false);

    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Int16Array(totalLength);
    let offset = 0;
    audioChunksRef.current.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.length;
    });

    const binary = String.fromCharCode(...new Uint8Array(result.buffer));
    const base64 = btoa(binary);
    
    setIsLoading(true);
    const transcription = await transcribeAudio(base64);
    setInput(prev => (prev ? prev + " " : "") + transcription);
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;
    if (isLoading) return;

    const userMessage: TroubleshootingLog = { 
      role: 'user', 
      content: input, 
      timestamp: new Date(),
      imageUrl: attachedFiles[0]?.url 
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentFiles = attachedFiles;
    
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    const activeTelemetry = {
      ...telemetry,
      snr: overrides.snr ?? telemetry.snr,
      rxPower: overrides.rxPower ?? telemetry.rxPower,
      bucTemp: overrides.bucTemp ?? telemetry.bucTemp,
      packetLoss: overrides.packetLoss ?? telemetry.packetLoss,
      isManualOverride: Object.values(overrides).some(v => v !== null)
    };

    const result = await getTroubleshootingAdvice(currentInput, { ...context, isStealthMode }, activeTelemetry, {
      thinking: isThinking,
      useSearch: useSearch,
      useMaps: true,
      mediaData: currentFiles.map(f => ({ data: f.data, mimeType: f.mimeType }))
    });

    if (result.error === "KEY_AUTH_FAILURE") {
       (window as any).aistudio?.openSelectKey();
    }

    const assistantMessage = { 
      role: 'assistant' as const, 
      content: result.text || 'COMM_FAILURE: Satellite link timed out.', 
      timestamp: new Date(),
      isCode: result.text?.includes('```'),
      grounding: result.grounding
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const updateOverride = (key: keyof Overrides, value: string) => {
    setOverrides(prev => ({
      ...prev,
      [key]: value === '' ? null : value
    }));
  };

  const isOverrideActive = Object.values(overrides).some(v => v !== null);

  return (
    <div className="glass rounded-[2rem] border-slate-800 flex flex-col h-full overflow-hidden bg-slate-950/40 relative">
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 z-20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
             <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
             </div>
             <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">STIA_SENTINEL_V6</h3>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Multi-Modal Recon</span>
                  {isOverrideActive && <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded font-black animate-pulse">OVERRIDE_ON</span>}
                </div>
             </div>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
             <button 
                onClick={onToggleNeuralCleaning}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${isNeuralCleaning ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span>{isNeuralCleaning ? 'NEURAL_CLEAN_ON' : 'DEEP_CLEAN'}</span>
             </button>
             <button 
                onClick={handleDownloadLog}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-[9px] font-black text-white uppercase tracking-widest hover:bg-slate-700 hover:border-cyan-500/50 transition-all shadow-lg"
              >
                <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span>EXPORT_LOG</span>
             </button>
             <button 
                onClick={() => setShowOverrides(!showOverrides)} 
                className={`p-2 rounded-lg border transition-all ${showOverrides ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                title="Manual Telemetry Injection"
              >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
             </button>
             <button onClick={() => setIsThinking(!isThinking)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${isThinking ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-slate-800 text-slate-500'}`}>Deep_Think</button>
             <button onClick={() => setUseSearch(!useSearch)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${useSearch ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-slate-800 text-slate-500'}`}>Grounding</button>
          </div>
        </div>
        
        {showOverrides && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-950/80 rounded-2xl border border-amber-500/30 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-1.5">
              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Injected_SNR</label>
              <input 
                type="text" 
                placeholder={telemetry.snr}
                value={overrides.snr ?? ''}
                onChange={e => updateOverride('snr', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] text-amber-400 mono outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Injected_Power</label>
              <input 
                type="text" 
                placeholder={telemetry.rxPower}
                value={overrides.rxPower ?? ''}
                onChange={e => updateOverride('rxPower', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] text-amber-400 mono outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Injected_Temp</label>
              <input 
                type="text" 
                placeholder={telemetry.bucTemp}
                value={overrides.bucTemp ?? ''}
                onChange={e => updateOverride('bucTemp', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] text-amber-400 mono outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Injected_Loss</label>
              <input 
                type="text" 
                placeholder={telemetry.packetLoss}
                value={overrides.packetLoss ?? ''}
                onChange={e => updateOverride('packetLoss', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] text-amber-400 mono outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="col-span-full flex justify-end">
              <button 
                onClick={() => setOverrides({ snr: null, rxPower: null, bucTemp: null, packetLoss: null })}
                className="text-[8px] font-bold text-slate-500 hover:text-amber-500 uppercase tracking-widest underline underline-offset-4 decoration-slate-800"
              >
                Clear_All_Overrides
              </button>
            </div>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-3xl border ${m.role === 'user' ? 'bg-cyan-950/30 border-cyan-500/30 rounded-br-none' : 'bg-slate-900 border-slate-800 rounded-bl-none'}`}>
              {m.imageUrl && <img src={m.imageUrl} className="max-w-xs rounded-xl mb-4 border border-slate-700 shadow-lg" />}
              <div className="text-[13px] text-slate-200 mono leading-relaxed whitespace-pre-wrap">{m.content}</div>
              
              {m.grounding && m.grounding.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-2">
                  <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-2">Grounding Sources:</p>
                  {m.grounding.map((chunk, idx) => (
                    <div key={idx} className="flex flex-col space-y-1">
                      {chunk.web && (
                        <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-400 hover:underline flex items-center">
                          <svg className="w-3 h-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          {chunk.web.title}
                        </a>
                      )}
                      {chunk.maps && (
                        <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-400 hover:underline flex items-center">
                          <svg className="w-3 h-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {chunk.maps.title || "Map Location"}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[8px] text-slate-600 font-bold mt-4 uppercase tracking-widest flex justify-between">
                 <span>{m.role === 'user' ? 'USER_UPLINK' : 'AGENT_RECON'}</span>
                 <span>{m.timestamp.toLocaleTimeString([], { hour12: false })}</span>
              </div>
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="bg-slate-900 p-4 rounded-2xl rounded-bl-none border border-slate-800 text-[10px] text-cyan-500 font-black uppercase tracking-widest animate-pulse">Processing_Intel_Stream...</div></div>}
      </div>

      <div className="p-6 bg-slate-900/60 border-t border-slate-800">
        {attachedFiles.length > 0 && (
          <div className="flex space-x-2 mb-4">
            {attachedFiles.map((f, i) => (
              <div key={i} className="relative group">
                <img src={f.url} className="w-12 h-12 rounded-lg border border-cyan-500/30 object-cover" />
                <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex space-x-3 items-center">
          <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-400 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} accept="image/*,video/*" />
          
          <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-3 rounded-xl border transition-all ${isRecording ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>

          <input 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="STIA_TERMINAL_INPUT >" 
            className="flex-grow bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs text-white mono outline-none focus:border-cyan-500/50" 
          />
          <button onClick={handleSend} disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-500 px-6 py-3.5 rounded-xl shadow-lg shadow-cyan-600/20 active:scale-95 transition-all">
             <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

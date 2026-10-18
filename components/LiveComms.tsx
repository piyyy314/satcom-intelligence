
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

export const LiveComms: React.FC<{ isStealthMode: boolean }> = ({ isStealthMode }) => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptions, setTranscriptions] = useState<{role: string, text: string}[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const decodeBase64 = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const startSession = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MICROPHONE_HARDWARE_NOT_FOUND");
      }
      const ai = new GoogleGenAI({ 
        apiKey: process.env.API_KEY, 
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } 
      });
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const inputCtx = new AudioContext({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
              const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
              sessionPromise.then(s => s.sendRealtimeInput({ audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64 = msg.serverContent.modelTurn.parts[0].inlineData.data;
              const bytes = decodeBase64(base64);
              const buffer = await decodeAudioData(bytes, audioContextRef.current!, 24000, 1);
              const source = audioContextRef.current!.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current!.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current!.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (msg.serverContent?.outputTranscription) {
               setTranscriptions(prev => [...prev, {role: 'STIA', text: msg.serverContent!.outputTranscription!.text}]);
            }
            if (msg.serverContent?.inputTranscription) {
               setTranscriptions(prev => [...prev, {role: 'USER', text: msg.serverContent!.inputTranscription!.text}]);
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => console.error("LIVE_ERROR", e)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: "You are the STIA AI agent. Respond via voice with technical precision.",
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("LIVE_INIT_ERROR", err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setError("PERMISSION_DENIED: Microphone access is required for voice uplink.");
      } else if (err.message === "MICROPHONE_HARDWARE_NOT_FOUND") {
        setError("HARDWARE_ERROR: No microphone detected on this terminal.");
      } else {
        setError("UPLINK_FAILURE: Could not establish live connection.");
      }
    }
  };

  const stopSession = () => {
    sessionRef.current?.close();
    setIsActive(false);
  };

  const handleDownloadTranscript = () => {
    if (transcriptions.length === 0) return;
    const data = `--- STIA COMMS VOICE TRANSCRIPT MAP ---\n` +
      `TIMESTAMP: ${new Date().toLocaleString()}\n` +
      `STATUS: OFFLINE / COMPLETED\n` +
      `---------------------------------------\n\n` +
      transcriptions.map(t => `[${t.role}]: ${t.text}`).join('\n') +
      `\n\n[EOF: TRANSCRIPTION]`;

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VOICE_COMMS_TRANSCRIPT_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass p-8 rounded-[2.5rem] border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center min-h-[500px] text-center">
       <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 border-2 transition-all duration-500 ${isActive ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.4)] scale-110' : 'bg-slate-900 border-slate-800'}`}>
          <div className={`flex space-x-1 ${isActive ? '' : 'opacity-20'}`}>
             {[1,2,3,4,5].map(i => <div key={i} className={`w-1 bg-cyan-400 rounded-full animate-pulse`} style={{height: `${12 + Math.random()*20}px`, animationDelay: `${i*0.1}s`}}></div>)}
          </div>
       </div>
       
       <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-4">Tactical_Live_Comms</h3>
       <p className="text-slate-500 text-xs font-bold mb-10 uppercase tracking-widest max-w-md">Low-latency voice synchronization with STIA Core. Mission protocols are synchronized in real-time.</p>
       
       {error && (
         <div className="mb-8 p-4 bg-red-900/20 border border-red-500/40 rounded-xl">
           <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">{error}</p>
         </div>
       )}

       <button onClick={isActive ? stopSession : startSession} className={`px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${isActive ? 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20' : 'bg-cyan-600 text-slate-950 hover:bg-cyan-500 shadow-lg shadow-cyan-600/20'}`}>
          {isActive ? 'Disconnect_Uplink' : 'Establish_Voice_Uplink'}
       </button>

       {transcriptions.length > 0 && (
         <div className="mt-12 w-full max-w-lg bg-slate-950/80 rounded-2xl p-6 border border-slate-800 text-left">
           <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Voice Encryption Transcripts</span>
              <button 
                 onClick={handleDownloadTranscript} 
                 className="bg-slate-800 hover:bg-slate-750 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all shadow-md animate-in fade-in"
              >
                DOWNLOAD_TRANSCRIPT
              </button>
           </div>
           <div className="h-40 overflow-y-auto scrollbar-hide space-y-3">
             {transcriptions.slice(-10).map((t, i) => (
               <div key={i} className="text-[10px] mono">
                 <span className={`font-black ${t.role === 'USER' ? 'text-slate-500' : 'text-cyan-500'}`}>{t.role}:</span>
                 <span className="text-slate-300 ml-2">{t.text}</span>
               </div>
             ))}
           </div>
         </div>
       )}
    </div>
  );

};


import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { generateTacticalImage, generateTacticalVideo, editTacticalImage } from '../services/geminiService.ts';

type MediaMode = 'IMAGE_GEN' | 'VIDEO_GEN' | 'IMAGE_EDIT';

export const MediaForge: React.FC = () => {
  const [mode, setMode] = useState<MediaMode>('IMAGE_GEN');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageSize, setImageSize] = useState('1K');
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [editSource, setEditSource] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await (window as any).aistudio?.hasSelectedApiKey();
      setHasKey(!!selected);
    };
    checkKey();
  }, []);

  const handleKeySelect = async () => {
    await (window as any).aistudio?.openSelectKey();
    setHasKey(true);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    let url: string | null = null;
    
    try {
      if (mode === 'IMAGE_GEN') {
        url = await generateTacticalImage(prompt, aspectRatio, imageSize);
      } else if (mode === 'VIDEO_GEN') {
        url = await generateTacticalVideo(prompt, aspectRatio as any, editSource || undefined);
      } else if (mode === 'IMAGE_EDIT' && editSource) {
        url = await editTacticalImage(editSource, prompt);
      }
      setResultUrl(url);
    } catch (err: any) {
      if (err.message === "KEY_AUTH_FAILURE") {
        handleKeySelect();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (rev) => setEditSource(rev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <header className="flex items-center justify-between mb-8">
        <div>
           <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center">
             <span className="mr-3 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">🎨</span> Tactical <span className="text-purple-500 ml-2">Media Forge</span>
           </h2>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 ml-1">Asset Generation & Intelligence Visualizer // Sector X</p>
        </div>
      </header>

      {!hasKey && (
        <div className="glass p-8 rounded-[2.5rem] border-amber-500/30 bg-amber-500/5 text-center space-y-4 mb-8">
           <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest">Advanced Media Hardware Locked</h3>
           <p className="text-[11px] text-slate-400 max-w-md mx-auto">Generation via Veo and High-Quality Image models requires a paid project API key. Please select an authorized key to continue.</p>
           <div className="flex flex-col items-center space-y-4">
             <button onClick={handleKeySelect} className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all">Select Paid API Key</button>
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[9px] text-slate-500 hover:text-amber-500 underline underline-offset-4 uppercase tracking-widest">Billing Documentation & Key Setup</a>
           </div>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${!hasKey ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
        <div className="lg:col-span-4 space-y-6">
           <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/40">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Forge Parameters</h3>
              
              <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl mb-6 border border-slate-800">
                {(['IMAGE_GEN', 'VIDEO_GEN', 'IMAGE_EDIT'] as MediaMode[]).map(m => (
                  <button key={m} onClick={() => {setMode(m); setResultUrl(null);}} className={`flex-grow py-2 rounded-lg text-[8px] font-black uppercase transition-all ${mode === m ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Prompt_Directive</label>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the tactical visualization..." className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-white mono outline-none focus:border-purple-500 min-h-[120px] shadow-inner resize-none" />
                 </div>

                 {(mode === 'IMAGE_GEN' || mode === 'VIDEO_GEN') && (
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Aspect_Ratio</label>
                       <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white mono outline-none focus:border-purple-500 cursor-pointer">
                          {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                    </div>
                 )}

                 {mode === 'IMAGE_GEN' && (
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Quality_Index</label>
                       <div className="grid grid-cols-3 gap-2">
                         {['1K', '2K', '4K'].map(s => (
                           <button key={s} onClick={() => setImageSize(s)} className={`py-2 rounded-lg text-[9px] font-black border transition-all ${imageSize === s ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{s}</button>
                         ))}
                       </div>
                    </div>
                 )}

                 {(mode === 'IMAGE_EDIT' || mode === 'VIDEO_GEN') && (
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Reference_Asset</label>
                      <button onClick={() => fileInputRef.current?.click()} className={`w-full py-6 rounded-xl border border-dashed flex flex-col items-center justify-center transition-all ${editSource ? 'border-purple-500/50 bg-purple-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                         {editSource ? <img src={editSource} className="h-16 w-16 object-cover rounded-lg mb-2" /> : <svg className="w-6 h-6 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>}
                         <span className="text-[8px] font-black text-slate-500 uppercase">{editSource ? 'REPLACE_ASSET' : 'UPLOAD_REFERENCE'}</span>
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*" />
                   </div>
                 )}

                 <button onClick={handleGenerate} disabled={isLoading || !prompt} className="w-full mt-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-[10px] font-black py-4 rounded-2xl uppercase tracking-[0.2em] shadow-lg shadow-purple-600/20 transition-all active:scale-95">
                    {isLoading ? 'Processing_Payload...' : 'Ignite_Forge'}
                 </button>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8">
           <div className="glass rounded-3xl border-slate-800 bg-slate-950/60 h-full min-h-[500px] flex flex-col overflow-hidden relative">
              <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Forge_Output // Stream_Alpha</span>
                 <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                 </div>
              </div>
              
              <div className="flex-grow flex items-center justify-center p-8">
                {isLoading ? (
                  <div className="flex flex-col items-center space-y-4">
                     <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                     <div className="text-center space-y-1">
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest animate-pulse">Neural Rendering in Progress</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Veo/Nano Engine Engaged</p>
                     </div>
                  </div>
                ) : resultUrl ? (
                  mode === 'VIDEO_GEN' ? (
                    <video src={resultUrl} controls className="max-w-full max-h-full rounded-2xl border border-purple-500/30 shadow-2xl" />
                  ) : (
                    <img src={resultUrl} className="max-w-full max-h-full rounded-2xl border border-purple-500/30 shadow-2xl" />
                  )
                ) : (
                  <div className="text-center opacity-20 flex flex-col items-center">
                     <svg className="w-24 h-24 text-slate-600 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Awaiting Forge Command</p>
                  </div>
                )}
              </div>

              {resultUrl && !isLoading && (
                 <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex justify-end">
                    <a href={resultUrl} download={`tactical_${mode.toLowerCase()}.png`} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-[9px] font-black text-white rounded-xl uppercase tracking-widest border border-slate-700 transition-all">Download_Output</a>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

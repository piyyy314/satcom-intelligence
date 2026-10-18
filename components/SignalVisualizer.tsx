
import * as React from 'react';
import { useEffect, useRef } from 'react';

interface Props {
  quality: number; 
  isJamming?: boolean;
  jammingPower?: number;
  rainFade?: number;
  isStealthMode: boolean;
}

export const SignalVisualizer: React.FC<Props> = ({ quality, isJamming = false, jammingPower = 0, rainFade = 0, isStealthMode }) => {
  const spectrumRef = useRef<HTMLCanvasElement>(null);
  const constellationRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const specCtx = spectrumRef.current?.getContext('2d');
    const constCtx = constellationRef.current?.getContext('2d');
    if (!specCtx || !constCtx) return;

    let frame = 0;
    const animate = () => {
      frame++;
      
      specCtx.clearRect(0, 0, 400, 150);
      
      specCtx.save();
      if (isJamming && jammingPower > 80 && Math.random() > 0.9 && !isStealthMode) {
        specCtx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
      }

      specCtx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      specCtx.lineWidth = 1;
      specCtx.beginPath();
      for (let i = 0; i < 400; i++) {
        const rainJitter = isStealthMode ? 0 : (rainFade / 4);
        const y = 135 + (Math.random() * (isStealthMode ? 1 : (4 + rainJitter)));
        if (i === 0) specCtx.moveTo(i, y); else specCtx.lineTo(i, y);
      }
      specCtx.stroke();

      if (isJamming && !isStealthMode) {
        specCtx.strokeStyle = `rgba(239, 68, 68, ${0.4 + (jammingPower / 200)})`;
        specCtx.lineWidth = 1;
        specCtx.beginPath();
        for (let i = 0; i < 400; i++) {
          const jammingLevel = (jammingPower / 100) * 80;
          const y = 135 - (Math.random() * jammingLevel);
          if (i === 0) specCtx.moveTo(i, y); else specCtx.lineTo(i, y);
        }
        specCtx.stroke();
      }

      specCtx.strokeStyle = isStealthMode ? '#a855f7' : (isJamming ? '#ef4444' : (rainFade > 5 ? '#fbbf24' : '#22d3ee'));
      specCtx.lineWidth = isStealthMode ? 3 : 2;
      specCtx.beginPath();
      for (let i = 0; i < 400; i++) {
        const distToCenter = Math.abs(200 - i);
        const effectiveQuality = isStealthMode ? 100 : Math.max(0, (isJamming ? quality - (jammingPower * 1.5) : quality) - (rainFade * 4));
        let signal = distToCenter < 60 ? Math.pow(60 - distToCenter, 1.4) * (effectiveQuality / 100) : 0;
        if (isJamming && distToCenter < 20 && !isStealthMode) {
           signal += (Math.random() - 0.5) * (jammingPower / 10);
        }
        const y = 135 - (signal + (isStealthMode ? Math.random() * 0.5 : Math.random() * 2));
        if (i === 0) specCtx.moveTo(i, y); else specCtx.lineTo(i, y);
      }
      specCtx.stroke();

      if (((quality > 0 && (quality < 90 || rainFade > 5) && frame % 200 < 50) || isJamming) && !isStealthMode) {
        specCtx.strokeStyle = isJamming ? '#ef4444' : '#fbbf24';
        specCtx.lineWidth = 1;
        specCtx.beginPath();
        const anomalyX = isJamming ? 200 + (Math.sin(frame/5) * (jammingPower * 2)) : 280;
        specCtx.moveTo(anomalyX, 150); specCtx.lineTo(anomalyX, 20);
        specCtx.stroke();
        
        specCtx.fillStyle = isJamming ? '#ef4444' : '#fbbf24';
        specCtx.font = 'bold 8px JetBrains Mono';
        const label = isJamming ? `JAM_LVL_${jammingPower}%` : rainFade > 5 ? "RAIN_ATTENUATION" : "ANOMALY";
        specCtx.fillText(label, anomalyX + 5, 30 + (isJamming ? Math.random()*2 : 0));
      } else if (isStealthMode && frame % 300 < 10) {
        specCtx.fillStyle = 'rgba(168, 85, 247, 0.2)';
        specCtx.fillRect(0, 0, 400, 150);
      }

      specCtx.restore();

      constCtx.clearRect(0, 0, 200, 200);
      constCtx.fillStyle = isStealthMode ? '#a855f7' : (isJamming || (quality - (rainFade * 3)) < 30 ? '#ef4444' : (rainFade > 5 ? '#fbbf24' : '#22d3ee'));
      const spread = isStealthMode ? 1 : (isJamming ? (jammingPower / 2) : Math.max(1, (100 - (quality - (rainFade * 3))) / 4));
      for(let i=0; i< (isStealthMode ? 8 : 40); i++) {
        const quadrants = [[50, 50], [150, 50], [50, 150], [150, 150]];
        quadrants.forEach(([qx, qy]) => {
          constCtx.fillRect(qx + (Math.random()-0.5)*spread, qy + (Math.random()-0.5)*spread, 1.5, 1.5);
        });
      }

      requestAnimationFrame(animate);
    };

    const handle = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(handle);
  }, [quality, isJamming, jammingPower, rainFade, isStealthMode]);

  const handleSnapshot = () => {
    if (!spectrumRef.current) return;
    const link = document.createElement('a');
    link.download = `SPECTRUM_TRACE_${new Date().getTime()}.png`;
    link.href = spectrumRef.current.toDataURL('image/png');
    link.click();
  };

  const handleDownloadTraceData = () => {
    const timeStr = new Date().toLocaleString();
    const margin = isStealthMode ? '20.0' : Math.max(0, (quality/10) - (isJamming ? jammingPower/10 : 0) - (rainFade/2)).toFixed(1);
    const lockStatus = isStealthMode ? 'STEALTH_ACTIVE' : (isJamming || rainFade > 8 ? 'CRITICAL' : (quality > 50 ? 'STABLE' : 'WEAK'));
    const rows = [
      ["Parameter", "Value"],
      ["Timestamp", timeStr],
      ["Signal Quality Initial", `${quality}%`],
      ["Is Jamming", isJamming ? "TRUE" : "FALSE"],
      ["Jamming Intensity", `${jammingPower}%`],
      ["Rain Attenuation Delta", `${rainFade} dB`],
      ["Calculated Carrier-to-Noise Offset", `${margin} dB`],
      ["Phase Lock Status", lockStatus],
      ["Stealth Protocol Mode", isStealthMode ? "ACTIVE" : "INACTIVE"]
    ];
    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SPECTRUM_SIGNAL_TRACE_${new Date().getTime()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`glass p-4 rounded-2xl border-slate-800 transition-all ${isJamming && !isStealthMode ? 'border-red-500/30 bg-red-950/5 tactical-glow' : ''} ${isStealthMode ? 'border-purple-500/30 bg-purple-950/5' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Spectrum Engine</p>
        </div>
        <div className="flex items-center space-x-2">
           <button 
             onClick={handleDownloadTraceData}
             className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 rounded-md text-[7px] font-black text-cyan-400 uppercase tracking-widest transition-all shadow-sm"
           >
             EXPORT_CSV
           </button>
           <button 
             onClick={handleSnapshot}
             className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[7px] font-black text-white uppercase tracking-widest transition-all"
           >
             Snapshot
           </button>
           <div className="flex space-x-2">
              {isStealthMode && <span className="text-[8px] font-bold text-purple-400 animate-pulse">STEALTH_PROTO_ACTIVE</span>}
              {rainFade > 1 && !isStealthMode && <span className="text-[8px] font-bold text-amber-500">RAIN_FADE: {rainFade}dB</span>}
              {isJamming && !isStealthMode && <span className="text-[8px] font-bold text-red-500 animate-pulse">EW_OVERRIDE_ACTIVE</span>}
           </div>
        </div>
      </div>
      <canvas ref={spectrumRef} width="400" height="150" className={`w-full h-32 bg-slate-950 rounded-xl mb-4 border border-slate-900 shadow-inner ${isJamming && jammingPower > 90 && !isStealthMode ? 'animate-pulse' : ''} ${isStealthMode ? 'border-purple-900 shadow-purple-500/10' : ''}`} />
      <div className="grid grid-cols-2 gap-4">
         <div className="relative">
            <canvas ref={constellationRef} width="200" height="200" className="w-full h-24 bg-slate-950 rounded-xl border border-slate-900" />
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <div className="w-full h-px bg-slate-500"></div>
              <div className="h-full w-px bg-slate-500 absolute"></div>
            </div>
         </div>
         <div className={`bg-slate-900 p-2 rounded-xl flex flex-col items-center justify-center border ${isStealthMode ? 'border-purple-900/50' : (isJamming ? 'border-red-900/50' : 'border-slate-800')}`}>
            <span className="text-[8px] font-bold text-slate-500 uppercase mb-1">Effective Margin</span>
            <span className={`text-xl font-bold mono ${isStealthMode ? 'text-purple-400' : (isJamming || rainFade > 8 ? 'text-red-500' : (rainFade > 3 ? 'text-amber-500' : 'text-cyan-400'))}`}>
              {isStealthMode ? '20.0' : Math.max(0, (quality/10) - (isJamming ? jammingPower/10 : 0) - (rainFade/2)).toFixed(1)} dB
            </span>
            <span className="text-[7px] text-slate-600 mono mt-1">LOCK_{isStealthMode ? 'STEALTH_ACTIVE' : (isJamming || rainFade > 8 ? 'CRITICAL' : (quality > 50 ? 'STABLE' : 'WEAK'))}</span>
         </div>
      </div>
    </div>
  );
};

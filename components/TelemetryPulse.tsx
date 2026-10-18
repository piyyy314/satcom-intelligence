
import * as React from 'react';

interface Props {
  telemetry: {
    snr: string;
    rxPower: string;
    bucTemp: string;
    packetLoss: string;
    status: string;
  };
  isStealthMode: boolean; // New prop
}

export const TelemetryPulse: React.FC<Props> = ({ telemetry, isStealthMode }) => {
  const displayedTelemetry = isStealthMode ? {
    snr: '20.00',
    rxPower: '-30.0',
    bucTemp: '35.0',
    packetLoss: '0.00',
    status: 'OPTIMAL',
  } : telemetry;

  return (
    <div className="flex items-center space-x-6">
      <div className="flex flex-col items-end">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">SNR Margin</span>
        <div className="flex items-baseline space-x-1">
          <span className={`text-sm font-bold mono ${parseFloat(displayedTelemetry.snr) < 6 && !isStealthMode ? 'text-red-500 animate-pulse' : 'text-cyan-400'} ${isStealthMode ? 'text-purple-400' : ''}`}>
            {displayedTelemetry.snr}
          </span>
          <span className="text-[8px] text-slate-600 font-bold uppercase">dB</span>
        </div>
      </div>
      
      <div className="h-8 w-px bg-slate-800"></div>
      
      <div className="flex flex-col items-end">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">BUC Temp</span>
        <div className="flex items-baseline space-x-1">
          <span className={`text-sm font-bold mono ${parseFloat(displayedTelemetry.bucTemp) > 65 && !isStealthMode ? 'text-orange-500' : 'text-slate-300'} ${isStealthMode ? 'text-purple-400' : ''}`}>
            {displayedTelemetry.bucTemp}
          </span>
          <span className="text-[8px] text-slate-600 font-bold uppercase">°C</span>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-800"></div>

      <div className="flex flex-col items-end">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">PLR</span>
        <div className="flex items-baseline space-x-1">
          <span className={`text-sm font-bold mono ${parseFloat(displayedTelemetry.packetLoss) > 5 && !isStealthMode ? 'text-red-500' : 'text-slate-400'} ${isStealthMode ? 'text-purple-400' : ''}`}>
            {displayedTelemetry.packetLoss}
          </span>
          <span className="text-[8px] text-slate-600 font-bold uppercase">%</span>
        </div>
      </div>
      
      <div className="hidden lg:flex flex-col items-center justify-center px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
         <span className="text-[7px] text-slate-500 uppercase font-black mb-0.5">Hardware_Link</span>
         <span className={`text-[9px] font-black uppercase tracking-tighter ${
           isStealthMode ? 'text-purple-500' : (displayedTelemetry.status === 'NOMINAL' ? 'text-green-500' : displayedTelemetry.status === 'DEGRADED' ? 'text-amber-500' : 'text-red-500')
         }`}>
           {isStealthMode ? 'STEALTH' : displayedTelemetry.status}
         </span>
      </div>
    </div>
  );
};

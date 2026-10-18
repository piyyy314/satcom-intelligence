
import * as React from 'react';
import { LookAngles, Satellite } from '../types.ts';

interface Props {
  angles: LookAngles;
  satellite: Satellite;
  onExport?: () => void;
}

export const LookAngleCard: React.FC<Props> = ({ angles, satellite, onExport }) => {
  const handleLocalExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    
    const data = `--- TACTICAL POINTING DATA ---\n` +
      `ASSET: ${satellite.name}\n` +
      `ORBITAL_SLOT: ${satellite.orbitalSlot}\n` +
      `TIMESTAMP: ${new Date().toLocaleString()}\n` +
      `------------------------------\n` +
      `AZIMUTH: ${angles.azimuth.toFixed(2)}°\n` +
      `ELEVATION: ${angles.elevation.toFixed(2)}°\n` +
      `POL_SKEW: ${angles.skew.toFixed(2)}°\n` +
      `SLANT_RANGE: ${angles.distance.toFixed(1)} km\n` +
      `------------------------------\n` +
      `STIA_CORE_VERIFIED_PARAMETERS`;
      
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `POINTING_${satellite.name.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass rounded-2xl p-6 border-slate-700 shadow-xl overflow-hidden relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-white flex items-center uppercase tracking-widest">
            <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2 animate-pulse"></span>
            Primary Look Angles
          </h2>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 ml-4">Sector Pointing Matrix</span>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleLocalExport}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-cyan-400 transition-all group"
            title="Export Pointing Data"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <div className="flex flex-col items-end">
            <span className="text-xs text-cyan-400 font-mono uppercase tracking-wider">{satellite.name}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Azimuth</p>
          <p className="text-2xl font-bold mono text-cyan-400">{angles.azimuth.toFixed(2)}°</p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Elevation</p>
          <p className="text-2xl font-bold mono text-amber-400">{angles.elevation.toFixed(2)}°</p>
        </div>
        <div className="space-y-1 mt-2">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Pol Skew</p>
          <p className="text-xl font-bold mono text-purple-400">{angles.skew.toFixed(2)}°</p>
        </div>
        <div className="space-y-1 mt-2 text-right">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Slant Range</p>
          <p className="text-xl font-bold mono text-slate-200">{(angles.distance).toFixed(1)} km</p>
        </div>
      </div>
    </div>
  );
};

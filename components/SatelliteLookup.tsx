
import * as React from 'react';
import { useState, useMemo } from 'react';
import { Coordinates, Satellite } from '../types.ts';
import { COMMON_SATELLITES } from '../constants.ts';
import { calculateLookAngles } from '../utils/geoUtils.ts';

interface Props {
  initialLoc: Coordinates;
  isStealthMode: boolean;
}

export const SatelliteLookup: React.FC<Props> = ({ initialLoc, isStealthMode }) => {
  const [loc, setLoc] = useState<Coordinates>(initialLoc);
  const [searchFilter, setSearchFilter] = useState('');

  const visibleSatellites = useMemo(() => {
    return COMMON_SATELLITES.map(sat => {
      const angles = calculateLookAngles(loc, sat.longitude);
      return { ...sat, angles };
    }).filter(sat => sat.angles.elevation > 0)
      .filter(sat => 
        sat.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        sat.operator?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        sat.orbitalSlot.toLowerCase().includes(searchFilter.toLowerCase())
      )
      .sort((a, b) => b.angles.elevation - a.angles.elevation);
  }, [loc, searchFilter]);

  const handleDownloadSatellites = () => {
    if (visibleSatellites.length === 0) return;
    const data = JSON.stringify({
      timestamp: new Date().toISOString(),
      observerCoordinates: loc,
      stealthMode: isStealthMode,
      totalVisibleCount: visibleSatellites.length,
      satellites: visibleSatellites.map(sat => ({
        id: sat.id,
        name: sat.name,
        operator: sat.operator,
        orbitalSlot: sat.orbitalSlot,
        status: sat.status,
        azimuth: sat.angles.azimuth,
        elevation: sat.angles.elevation,
        distanceKm: sat.angles.distance / 1000,
        frequencies: sat.frequencies || []
      }))
    }, null, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SATELLITE_VISIBILITY_REPORT_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 glass p-6 rounded-3xl border-slate-800 bg-slate-950/40">
        <div>
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center">
              <span className="mr-3 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">📡</span>
              Satellite <span className="text-blue-500 ml-2">Lookup</span>
            </h2>
            {visibleSatellites.length > 0 && (
              <button 
                 onClick={handleDownloadSatellites}
                 className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all shadow-md"
              >
                DOWNLOAD_REPORT
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Asset Visibility & Orbit Finder</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Latitude</label>
            <input 
              type="number" 
              value={loc.lat} 
              onChange={e => setLoc({...loc, lat: parseFloat(e.target.value)})}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mono outline-none focus:border-blue-500 transition-all w-28"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Longitude</label>
            <input 
              type="number" 
              value={loc.lng} 
              onChange={e => setLoc({...loc, lng: parseFloat(e.target.value)})}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mono outline-none focus:border-blue-500 transition-all w-28"
            />
          </div>
          <div className="space-y-1 flex-grow min-w-[200px]">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Search Assets</label>
            <input 
              type="text" 
              placeholder="NAME, OPERATOR, OR SLOT..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mono outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleSatellites.map(sat => (
          <div key={sat.id} className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 transition-all group border-b-4 border-b-blue-500/20 hover:border-b-blue-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{sat.operator}</span>
                <h3 className="text-lg font-black text-white uppercase group-hover:text-blue-400 transition-colors">{sat.name}</h3>
              </div>
              <div className="bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                <span className="text-[10px] font-bold text-blue-400 mono">{sat.orbitalSlot}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Elevation</p>
                <p className="text-lg font-black text-white mono">{sat.angles.elevation.toFixed(1)}°</p>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Azimuth</p>
                <p className="text-lg font-black text-white mono">{sat.angles.azimuth.toFixed(1)}°</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Active Frequencies</p>
                <div className="flex flex-wrap gap-2">
                  {sat.frequencies?.map((freq, i) => (
                    <span key={i} className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-300 mono group-hover:border-blue-500/30 transition-colors">
                      {freq}
                    </span>
                  )) || (
                    <span className="text-[10px] text-slate-600 italic">No frequency data available</span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center px-1">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-600 uppercase">Distance</span>
                  <span className="text-[10px] font-bold text-slate-400 mono">{(sat.angles.distance / 1000).toFixed(2)}k km</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${sat.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visibleSatellites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-3xl border-slate-800 bg-slate-950/20">
          <div className="text-5xl mb-4">🛰️</div>
          <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">No Satellites Found</h3>
          <p className="text-slate-500 text-sm max-w-md">No assets are currently visible above the horizon from these coordinates. Adjust your location or search filters.</p>
        </div>
      )}
    </div>
  );
};

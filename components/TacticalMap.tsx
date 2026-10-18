import * as React from 'react';
import { useRef, useState, useMemo } from 'react';
import { Coordinates, Satellite, MeshNode } from '../types.ts';

interface Props {
  userLoc: Coordinates;
  satellite: Satellite;
  isTracking: boolean;
  isStealthMode: boolean;
  meshNodes?: MeshNode[];
  onLocChange?: (loc: Coordinates) => void;
  onTrackingChange?: (val: boolean) => void;
}

export const TacticalMap: React.FC<Props> = ({ 
  userLoc, 
  satellite, 
  isTracking, 
  isStealthMode, 
  meshNodes,
  onLocChange, 
  onTrackingChange 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapMode, setHeatmapMode] = useState<'INTERFERENCE' | 'SIGNAL' | 'COMBINED'>('INTERFERENCE');
  const [zoomMode, setZoomMode] = useState<'LOCAL_AO' | 'GLOBAL'>('LOCAL_AO');
  const [selectedHeatNode, setSelectedHeatNode] = useState<MeshNode | null>(null);

  // Generate fallback local mesh nodes around userLoc if none provided or empty
  const activeMeshNodes: MeshNode[] = useMemo(() => {
    if (meshNodes && meshNodes.length > 0) return meshNodes;

    return [
      {
        id: "0x42A1",
        callsign: "GW-ALPHA",
        role: "Gateway",
        status: "ONLINE",
        rssi: -68,
        snr: 12.4,
        hops: 1,
        latency: 14,
        battery: 98,
        frequency: "915.0 MHz",
        lastSeen: "JUST NOW",
        macAddress: "3C:84:27:11:00:A1",
        firmwareVersion: "v2.5.4-SECURE-HARDENED",
        chipset: "ESP32-S3 / SX1262",
        txPower: "27 dBm",
        packetLoss: 0.1,
        lat: userLoc.lat + 0.08,
        lng: userLoc.lng - 0.12,
        interferenceLevel: 'LOW',
        diagnosticNote: "Master Gateway - Spectrum clear, high dBi directional link."
      },
      {
        id: "0x89B2",
        callsign: "RELAY-BRAVO",
        role: "Relay",
        status: "DIRECT",
        rssi: -82,
        snr: 6.1,
        hops: 1,
        latency: 28,
        battery: 84,
        frequency: "915.0 MHz",
        lastSeen: "3s AGO",
        macAddress: "3C:84:27:11:00:B2",
        firmwareVersion: "v2.5.4-SECURE-HARDENED",
        chipset: "NRF52840 / SX1262",
        txPower: "22 dBm",
        packetLoss: 1.2,
        lat: userLoc.lat - 0.15,
        lng: userLoc.lng + 0.22,
        interferenceLevel: 'LOW',
        diagnosticNote: "Relay Node - Stable link margin."
      },
      {
        id: "0x77D4",
        callsign: "OUTPOST-DELTA",
        role: "Edge",
        status: "DEGRADED",
        rssi: -108,
        snr: -2.1,
        hops: 3,
        latency: 142,
        battery: 41,
        frequency: "915.0 MHz",
        lastSeen: "18s AGO",
        macAddress: "3C:84:27:11:00:D4",
        firmwareVersion: "v2.4.12-mesh-release",
        chipset: "Semtech SX1276",
        txPower: "14 dBm",
        packetLoss: 14.2,
        lat: userLoc.lat + 0.25,
        lng: userLoc.lng + 0.35,
        interferenceLevel: 'CRITICAL',
        diagnosticNote: "CRITICAL RF NOISE ZONE: High co-channel interference or localized jammer detected."
      },
      {
        id: "0x33C9",
        callsign: "TAC-MOBILE-1",
        role: "Mobile",
        status: "ONLINE",
        rssi: -96,
        snr: 1.8,
        hops: 2,
        latency: 64,
        battery: 67,
        frequency: "915.0 MHz",
        lastSeen: "1s AGO",
        macAddress: "3C:84:27:11:00:C9",
        firmwareVersion: "v2.5.2-TAC-STEALTH",
        chipset: "ESP32-C3 / SX1262",
        txPower: "20 dBm",
        packetLoss: 5.8,
        lat: userLoc.lat - 0.28,
        lng: userLoc.lng - 0.18,
        interferenceLevel: 'MODERATE',
        diagnosticNote: "Mobile Patrol - Experiencing terrain multipath fading & moderate interference."
      },
      {
        id: "0x99F0",
        callsign: "SENSOR-ECHO",
        role: "Edge",
        status: "DEGRADED",
        rssi: -114,
        snr: -5.2,
        hops: 4,
        latency: 198,
        battery: 29,
        frequency: "915.0 MHz",
        lastSeen: "45s AGO",
        macAddress: "3C:84:27:11:00:F0",
        firmwareVersion: "v2.4.12-mesh-release",
        chipset: "Semtech SX1262",
        txPower: "14 dBm",
        packetLoss: 22.0,
        lat: userLoc.lat + 0.40,
        lng: userLoc.lng - 0.30,
        interferenceLevel: 'SEVERE',
        diagnosticNote: "SEVERE ATTENUATION: Broadband noise floor elevated to -108 dBm."
      }
    ];
  }, [meshNodes, userLoc.lat, userLoc.lng]);

  // Coordinate projections
  const getGlobalX = (lng: number) => ((lng + 180) / 360) * 100;
  const getGlobalY = (lat: number) => ((90 - lat) / 180) * 100;

  const getLocalX = (lng: number) => {
    const delta = lng - userLoc.lng;
    return Math.max(5, Math.min(95, 50 + delta * 40));
  };
  const getLocalY = (lat: number) => {
    const delta = userLoc.lat - lat;
    return Math.max(5, Math.min(95, 50 + delta * 40));
  };

  const getX = zoomMode === 'LOCAL_AO' ? getLocalX : getGlobalX;
  const getY = zoomMode === 'LOCAL_AO' ? getLocalY : getGlobalY;

  const userX = getX(userLoc.lng);
  const userY = getY(userLoc.lat);
  const satX = getX(satellite.longitude);
  const satY = zoomMode === 'LOCAL_AO' ? 10 : getY(0);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || !onLocChange) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    let lng: number;
    let lat: number;

    if (zoomMode === 'LOCAL_AO') {
      const deltaLng = (x - 50) / 40;
      const deltaLat = (50 - y) / 40;
      lng = userLoc.lng + deltaLng;
      lat = userLoc.lat + deltaLat;
    } else {
      lng = (x / 100) * 360 - 180;
      lat = 90 - (y / 100) * 180;
    }

    if (isTracking && onTrackingChange) {
      onTrackingChange(false);
    }

    onLocChange({ lat, lng });
  };

  const coverageColor = isStealthMode ? '#a855f7' : '#22d3ee';

  const getNodeInterferenceInfo = (node: MeshNode) => {
    const rssi = node.rssi;
    const snr = node.snr;
    const loss = node.packetLoss || 0;

    if (rssi < -105 || snr < -2 || loss > 15) {
      return {
        level: 'CRITICAL',
        label: 'SEVERE RF INTERFERENCE / JAMMING',
        fillGradient: 'url(#criticalInterferenceGradient)',
        strokeColor: '#ef4444',
        textColor: 'text-red-400',
        badgeBg: 'bg-red-950/80 border-red-500/50 text-red-400',
        radius: 45
      };
    } else if (rssi < -92 || snr < 3 || loss > 5) {
      return {
        level: 'MODERATE',
        label: 'MODERATE RF NOISE / ATTENUATION',
        fillGradient: 'url(#moderateInterferenceGradient)',
        strokeColor: '#f59e0b',
        textColor: 'text-amber-400',
        badgeBg: 'bg-amber-950/80 border-amber-500/50 text-amber-400',
        radius: 35
      };
    } else {
      return {
        level: 'LOW',
        label: 'CLEAR RF SPECTRUM',
        fillGradient: 'url(#clearSignalGradient)',
        strokeColor: '#10b981',
        textColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400',
        radius: 28
      };
    }
  };

  const interferenceCount = activeMeshNodes.filter(n => n.rssi < -92 || n.snr < 3).length;

  return (
    <div className="space-y-2">
      {/* MAP CONTAINER */}
      <div 
        ref={mapRef}
        onClick={handleMapClick}
        className={`glass rounded-2xl p-4 border-slate-800 bg-slate-950/70 overflow-hidden relative min-h-[260px] sm:min-h-[300px] group cursor-crosshair hover:border-cyan-500/30 transition-all duration-700 ${
          isStealthMode ? 'border-purple-900/40 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : ''
        }`}
      >
        {/* Background Grid Lines */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `linear-gradient(${isStealthMode ? '#6366f1' : '#334155'} 1px, transparent 1px), linear-gradient(90deg, ${isStealthMode ? '#6366f1' : '#334155'} 1px, transparent 1px)`,
              backgroundSize: '12.5% 12.5%'
            }}
          />
        </div>

        {/* TOP BAR / CONTROL OVERLAYS */}
        <div className="absolute top-2 left-3 right-3 z-30 pointer-events-none flex flex-wrap items-center justify-between gap-2">
          {/* Title Badge */}
          <div className="flex items-center space-x-2 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 backdrop-blur">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              {zoomMode === 'LOCAL_AO' ? 'AO LOCAL TACTICAL PROJECTION' : 'GLOBAL PROJECTION'}
            </span>
            <span className="text-slate-700">•</span>
            <span className={`text-[8px] font-mono font-bold ${interferenceCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {interferenceCount} RF NOISE ZONES
            </span>
          </div>

          {/* Interactive Controls */}
          <div className="pointer-events-auto flex items-center space-x-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800/80 backdrop-blur">
            {/* Heatmap Toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowHeatmap(!showHeatmap); }}
              className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                showHeatmap 
                  ? 'bg-red-600/90 text-white shadow-md shadow-red-600/30 border border-red-500/50' 
                  : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
              }`}
            >
              🔥 RF HEATMAP: {showHeatmap ? 'ON' : 'OFF'}
            </button>

            {/* Mode Switcher */}
            {showHeatmap && (
              <select
                value={heatmapMode}
                onChange={(e) => { e.stopPropagation(); setHeatmapMode(e.target.value as any); }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-800 text-[8px] font-mono font-bold text-slate-300 rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-slate-700"
              >
                <option value="INTERFERENCE">NOISE ZONES</option>
                <option value="SIGNAL">SIGNAL COVERAGE</option>
                <option value="COMBINED">FULL SPECTRUM</option>
              </select>
            )}

            {/* Zoom Mode Toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setZoomMode(zoomMode === 'LOCAL_AO' ? 'GLOBAL' : 'LOCAL_AO'); }}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 rounded-lg text-[8px] font-mono font-bold uppercase transition-all cursor-pointer"
            >
              {zoomMode === 'LOCAL_AO' ? '🔍 AO ZOOM' : '🌐 GLOBAL'}
            </button>
          </div>
        </div>

        {/* SVG MAP & HEATMAP OVERLAY LAYER */}
        <div className="relative w-full h-full pointer-events-none mt-6">
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <radialGradient id="criticalInterferenceGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
                <stop offset="35%" stopColor="#f43f5e" stopOpacity="0.45" />
                <stop offset="70%" stopColor="#e11d48" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="moderateInterferenceGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.60" />
                <stop offset="45%" stopColor="#d97706" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="clearSignalGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={coverageColor} stopOpacity="0.50" />
                <stop offset="50%" stopColor={coverageColor} stopOpacity="0.20" />
                <stop offset="100%" stopColor={coverageColor} stopOpacity="0" />
              </radialGradient>

              <radialGradient id="coverageHeatmap" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={coverageColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={coverageColor} stopOpacity="0" />
              </radialGradient>

              <filter id="heatmapBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>

            <circle 
              cx={`${satX}%`} 
              cy={`${satY}%`} 
              r="30%" 
              fill="url(#coverageHeatmap)"
              className="animate-pulse"
              style={{ transition: 'cx 1s ease-in-out' }}
            />

            <line 
              x1={`${userX}%`} y1={`${userY}%`} 
              x2={`${satX}%`} y2={`${satY}%`} 
              stroke={isStealthMode ? 'rgba(168, 85, 247, 0.4)' : 'rgba(34, 211, 238, 0.3)'} 
              strokeWidth="1.5" 
              strokeDasharray="4 3"
            />

            {/* RF INTERFERENCE HEATMAP OVERLAY LAYER */}
            {showHeatmap && activeMeshNodes.map((node) => {
              const nx = getX(node.lng ?? userLoc.lng);
              const ny = getY(node.lat ?? userLoc.lat);
              const info = getNodeInterferenceInfo(node);

              if (heatmapMode === 'INTERFERENCE' && info.level === 'LOW') return null;
              if (heatmapMode === 'SIGNAL' && info.level !== 'LOW') return null;

              return (
                <g key={`heatmap-${node.id}`}>
                  <circle
                    cx={`${nx}%`}
                    cy={`${ny}%`}
                    r={`${info.radius}%`}
                    fill={info.fillGradient}
                    filter="url(#heatmapBlur)"
                    className={info.level === 'CRITICAL' ? 'animate-pulse' : ''}
                  />

                  {info.level === 'CRITICAL' && (
                    <>
                      <circle
                        cx={`${nx}%`}
                        cy={`${ny}%`}
                        r="8%"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                        className="animate-ping opacity-60"
                      />
                      <circle
                        cx={`${nx}%`}
                        cy={`${ny}%`}
                        r="14%"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="0.75"
                        opacity="0.4"
                      />
                    </>
                  )}

                  {info.level === 'MODERATE' && (
                    <circle
                      cx={`${nx}%`}
                      cy={`${ny}%`}
                      r="10%"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="0.75"
                      strokeDasharray="2 2"
                      opacity="0.5"
                    />
                  )}
                </g>
              );
            })}

            {/* Mesh Inter-Node Communication Links */}
            {activeMeshNodes.map((node, i) => {
              const nx1 = getX(node.lng ?? userLoc.lng);
              const ny1 = getY(node.lat ?? userLoc.lat);
              const targetNode = activeMeshNodes[(i + 1) % activeMeshNodes.length];
              const nx2 = getX(targetNode.lng ?? userLoc.lng);
              const ny2 = getY(targetNode.lat ?? userLoc.lat);

              const isLinkBad = node.rssi < -100 || targetNode.rssi < -100;

              return (
                <line
                  key={`link-${node.id}-${targetNode.id}`}
                  x1={`${nx1}%`} y1={`${ny1}%`}
                  x2={`${nx2}%`} y2={`${ny2}%`}
                  stroke={isLinkBad ? '#ef4444' : '#10b981'}
                  strokeWidth={isLinkBad ? "1" : "0.75"}
                  strokeDasharray={isLinkBad ? "2 2" : "3 3"}
                  opacity={isLinkBad ? "0.7" : "0.35"}
                />
              );
            })}
          </svg>

          {/* SATELLITE ICON */}
          <div 
            className="absolute w-4 h-4 -ml-2 -mt-2 transition-all duration-1000 pointer-events-auto"
            style={{ left: `${satX}%`, top: `${satY}%` }}
          >
            <div className={`absolute inset-0 rounded-sm rotate-45 animate-pulse ${isStealthMode ? 'bg-purple-500/20' : 'bg-amber-500/20'}`} />
            <div className={`absolute inset-1 border rounded-sm rotate-45 ${isStealthMode ? 'border-purple-500' : 'border-amber-500'}`} />
            <span className={`absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase whitespace-nowrap opacity-80 ${isStealthMode ? 'text-purple-400' : 'text-amber-500'}`}>
              {satellite.orbitalSlot}
            </span>
          </div>

          {/* USER POSITION ICON */}
          <div 
            className="absolute w-3.5 h-3.5 -ml-1.75 -mt-1.75 transition-all duration-700 pointer-events-auto z-20"
            style={{ left: `${userX}%`, top: `${userY}%` }}
          >
            {isTracking && (
              <>
                <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${isStealthMode ? 'bg-purple-500' : 'bg-cyan-500'}`} />
                <div className={`absolute -inset-2 border rounded-full animate-pulse ${isStealthMode ? 'border-purple-500/30' : 'border-cyan-500/30'}`} />
              </>
            )}
            <div className={`absolute inset-0.5 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] border border-white/20 ${isStealthMode ? 'bg-purple-400 shadow-purple-500/80' : 'bg-cyan-400'}`} />
            <span className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] font-mono font-bold uppercase whitespace-nowrap bg-slate-950/80 px-1 rounded border border-slate-800 ${isStealthMode ? 'text-purple-400' : 'text-cyan-400'}`}>
              ORIGIN
            </span>
          </div>

          {/* MESH NODES & RF INTERFERENCE HOTSPOTS ON MAP */}
          {activeMeshNodes.map((node) => {
            const nx = getX(node.lng ?? userLoc.lng);
            const ny = getY(node.lat ?? userLoc.lat);
            const info = getNodeInterferenceInfo(node);
            const isSelected = selectedHeatNode?.id === node.id;

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHeatNode(isSelected ? null : node);
                }}
                className="absolute -ml-3 -mt-3 w-6 h-6 z-20 pointer-events-auto cursor-pointer group/node"
                style={{ left: `${nx}%`, top: `${ny}%` }}
              >
                <div 
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-[8px] font-mono font-black transition-all transform group-hover/node:scale-125 ${
                    info.level === 'CRITICAL'
                      ? 'bg-red-950/90 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-bounce'
                      : info.level === 'MODERATE'
                      ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                  } ${isSelected ? 'ring-2 ring-white scale-125' : ''}`}
                >
                  {node.callsign.substring(0, 2)}
                </div>

                <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-slate-800 px-1.5 py-0.5 rounded text-[7px] font-mono font-bold whitespace-nowrap text-white pointer-events-none shadow-md">
                  <span className={info.textColor}>{node.callsign}</span>
                  <span className="text-slate-500 ml-1">({node.rssi}dBm)</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM HUD FOOTER: HEATMAP LEGEND */}
        <div className="absolute bottom-2 left-3 right-3 z-30 pointer-events-none flex flex-wrap items-end justify-between gap-2">
          <div className="bg-slate-950/90 p-2 rounded-xl border border-slate-800/80 backdrop-blur pointer-events-auto text-[8px] font-mono space-y-1">
            <div className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
              RF INTERFERENCE HEATMAP LEGEND
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-bold">CRITICAL NOISE (&lt;-105dBm)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-400 font-bold">ATTENUATION (-90 to -105dBm)</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 font-bold">CLEAR SPECTRUM (&gt;-90dBm)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end pointer-events-none bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-[8px] font-mono text-slate-400">
            <span>AO LAT: {userLoc.lat.toFixed(4)}° | LNG: {userLoc.lng.toFixed(4)}°</span>
            <span className="text-cyan-400">SAT SLOT: {satellite.orbitalSlot} ({satellite.longitude.toFixed(1)}°E)</span>
          </div>
        </div>
      </div>

      {/* SELECTED HEAT NODE INSPECTOR */}
      {selectedHeatNode && (
        <div className="glass p-4 rounded-2xl border-red-500/40 bg-slate-950/90 animate-in fade-in slide-in-from-top-2 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-white font-mono">{selectedHeatNode.callsign}</span>
              <span className="text-[8px] font-mono text-slate-500">[{selectedHeatNode.id}]</span>
              <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded ${
                selectedHeatNode.rssi < -105 ? 'bg-red-950 text-red-400 border border-red-500/40' :
                selectedHeatNode.rssi < -92 ? 'bg-amber-950 text-amber-400 border border-amber-500/40' :
                'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
              }`}>
                {selectedHeatNode.rssi < -105 ? 'CRITICAL RF JAMMING ZONE' : selectedHeatNode.rssi < -92 ? 'MODERATE RF ATTENUATION' : 'NOMINAL MESH SIGNAL'}
              </span>
            </div>

            <button
              onClick={() => setSelectedHeatNode(null)}
              className="text-slate-500 hover:text-white text-xs font-bold px-2 py-0.5 bg-slate-900 rounded"
            >
              ✕ CLOSE
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] font-mono">
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase">Signal Strength (RSSI)</span>
              <span className={`text-xs font-bold ${selectedHeatNode.rssi < -100 ? 'text-red-400' : 'text-emerald-400'}`}>
                {selectedHeatNode.rssi} dBm
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase">Signal-to-Noise (SNR)</span>
              <span className={`text-xs font-bold ${selectedHeatNode.snr < 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                {selectedHeatNode.snr} dB
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase">Packet Loss Rate</span>
              <span className={`text-xs font-bold ${selectedHeatNode.packetLoss > 10 ? 'text-red-400' : 'text-slate-200'}`}>
                {selectedHeatNode.packetLoss}%
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase">Noise Floor Estimate</span>
              <span className="text-xs font-bold text-purple-400">
                {(selectedHeatNode.rssi - selectedHeatNode.snr).toFixed(1)} dBm
              </span>
            </div>
          </div>

          {selectedHeatNode.diagnosticNote && (
            <p className="text-[10px] font-mono text-amber-300/90 bg-amber-950/30 p-2.5 rounded-xl border border-amber-500/30">
              ⚠️ {selectedHeatNode.diagnosticNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

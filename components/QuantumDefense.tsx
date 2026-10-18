
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { playSystemVoice } from '../services/audioService.ts';
import { PQCService, PQCKeyPair } from '../services/pqcService.ts';
import { PqcAuditService } from '../services/pqcAuditService.ts';

type QKDStatus = 'SYNCHRONIZED' | 'SYNCING' | 'DECOHERENCE_ERROR' | 'EAVESDROP_DETECTED' | 'AETHER_RESONANCE';
interface QuantumEvent {
  id: string;
  timestamp: string;
  type: 'QKD' | 'HUP' | 'AETHER' | 'VACUUM';
  severity: 'NOMINAL' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  message: string;
}

const statusConfig = {
    SYNCHRONIZED: { label: 'SYNCHRONIZED', color: 'text-cyan-400', pulse: true },
    SYNCING: { label: 'SYNCING...', color: 'text-amber-400', pulse: true },
    DECOHERENCE_ERROR: { label: 'DECOHERENCE ERROR', color: 'text-orange-500', pulse: false },
    EAVESDROP_DETECTED: { label: 'EAVESDROPPING DETECTED!', color: 'text-red-500', pulse: true },
    AETHER_RESONANCE: { label: 'AETHERIC RESONANCE', color: 'text-purple-400', pulse: true },
};

interface Props {
  isStealthMode: boolean;
  addMissionLog: (detail: string, status: any) => void;
}

export const QuantumDefense: React.FC<Props> = ({ isStealthMode, addMissionLog }) => {
    const [qkdStatus, setQkdStatus] = useState<QKDStatus>('SYNCHRONIZED');
    const [hupScramblerActive, setHupScramblerActive] = useState(false);
    const [aetherSaturation, setAetherSaturation] = useState(0.42);
    const [vacuumFluctuation, setVacuumFluctuation] = useState(1.234);
    const [eventLog, setEventLog] = useState<QuantumEvent[]>([
        { id: 'qe-init-3', timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'AETHER', severity: 'SUCCESS', message: 'Aetheric resonance frequency locked at 420.69 GHz.' },
        { id: 'qe-init-2', timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'VACUUM', severity: 'NOMINAL', message: 'Vacuum fluctuation calibration synchronized.' },
        { id: 'qe-init-1', timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'QKD', severity: 'NOMINAL', message: 'Entropy collection matrix primed.' },
    ]);
    const [syncPhase, setSyncPhase] = useState<string | null>(null);
    
    // PQC Trap Management State
    const [pqcKeys, setPqcKeys] = useState<PQCKeyPair | null>(null);
    const [traps, setTraps] = useState<{id: string, metadata: string, signature: Uint8Array, verified?: boolean}[]>([]);
    const [newTrapMetadata, setNewTrapMetadata] = useState("trap_id: kinetic_001 | location: /usr/local/bin/deploy_tool");
    const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
    
    // Grover's Search State
    const [isGroverRunning, setIsGroverRunning] = useState(false);
    const [groverStep, setGroverStep] = useState(0);
    const [groverProbabilities, setGroverProbabilities] = useState([0.25, 0.25, 0.25, 0.25]);
    const [targetState, setTargetState] = useState('11');

    const aetherCanvasRef = useRef<HTMLCanvasElement>(null);
    const breachTriggeredRef = useRef(false);
    
    const effectiveQkdStatus = isStealthMode ? 'AETHER_RESONANCE' : qkdStatus;
    const isCritical = effectiveQkdStatus === 'EAVESDROP_DETECTED';

    useEffect(() => {
        const interval = setInterval(() => {
            setVacuumFluctuation(1.234 + (Math.random() - 0.5) * 0.05);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const canvas = aetherCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        const particles: any[] = [];
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: Math.random()
            });
        }

        const animate = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.1 * aetherSaturation})`;
            ctx.beginPath();
            for (let i = 0; i < canvas.width; i += 20) {
                ctx.moveTo(i, 0);
                ctx.lineTo(i + Math.sin(frame / 50 + i) * 10, canvas.height);
            }
            ctx.stroke();

            particles.forEach(p => {
                p.x += p.vx * (1 + aetherSaturation);
                p.y += p.vy * (1 + aetherSaturation);
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.fillStyle = `rgba(168, 85, 247, ${p.life * aetherSaturation})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(animate);
        };
        const h = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(h);
    }, [aetherSaturation]);
    
    const addLocalLog = (type: QuantumEvent['type'], severity: QuantumEvent['severity'], message: string) => {
        const newEvent: QuantumEvent = {
            id: `qe-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type,
            severity,
            message,
        };
        setEventLog(prev => [newEvent, ...prev].slice(0, 50));
    };

    const handleQkdSync = (forceBreach = false) => {
        if (effectiveQkdStatus === 'SYNCING' || isStealthMode) return;
        
        breachTriggeredRef.current = false;
        setQkdStatus('SYNCING');
        setSyncPhase('PHASE_1: PHOTON_EMISSION');
        addLocalLog('QKD', 'NOMINAL', 'Photon stream initiated for key exchange.');
        playSystemVoice('Initiating quantum key exchange.');
        
        setTimeout(() => {
            if (forceBreach) {
                setQkdStatus('EAVESDROP_DETECTED');
                setSyncPhase('PHASE_2: PARITY_FAILURE [COLLAPSE]');
                breachTriggeredRef.current = true;
                addLocalLog('QKD', 'CRITICAL', 'QUANTUM_BREACH: External measurement detected on link path!');
                addMissionLog(`CRITICAL: Eavesdropping attempt detected on Quantum Channel. Polarization error > 25%.`, 'BREACH');
                playSystemVoice('Critical alert. Measurement attempt detected on quantum channel.');
            } else {
                setSyncPhase('PHASE_2: PARITY_CHECK');
                addLocalLog('QKD', 'NOMINAL', 'Executing Bell-state measurement on inbound pulse.');
            }
        }, 1200);

        setTimeout(() => {
            if (!breachTriggeredRef.current) {
                setSyncPhase('PHASE_3: VERIFICATION');
                addLocalLog('QKD', 'NOMINAL', 'Validating entanglement coefficients...');
            }
        }, 2400);

        setTimeout(() => {
            setSyncPhase(null);
            if (breachTriggeredRef.current) return;
            setQkdStatus('SYNCHRONIZED');
            addLocalLog('QKD', 'NOMINAL', 'Key synchronization successful. Entanglement verified.');
        }, 3600);
    };

    const toggleAetherModulator = () => {
        const newSaturation = aetherSaturation > 0.8 ? 0.42 : 0.95;
        setAetherSaturation(newSaturation);
        const msg = newSaturation > 0.8 ? "Aetheric Resonance Modulator: OVERDRIVE" : "Aetheric Resonance Modulator: BALANCED";
        addLocalLog('AETHER', 'NOMINAL', msg);
        playSystemVoice(`Aether resonance ${newSaturation > 0.8 ? 'overdriven' : 'stabilized'}.`);
    };

    const handleGeneratePQCKeys = async () => {
        setIsGeneratingKeys(true);
        try {
            const keys = PQCService.generateKeypair();
            setPqcKeys(keys);
            addLocalLog('QKD', 'NOMINAL', 'PQC Keypair generated (ML-DSA-65). Bit-packed and ready.');
            playSystemVoice('Post-quantum keypair generated.');
        } catch (err) {
            addLocalLog('QKD', 'CRITICAL', 'PQC Keygen failure.');
        } finally {
            setIsGeneratingKeys(false);
        }
    };

    const handleSignTrap = async () => {
        if (!pqcKeys || !newTrapMetadata || !pqcKeys._keysInstance) return;
        try {
            const signature = PQCService.sign(newTrapMetadata, pqcKeys._keysInstance);
            const newTrap = {
                id: `trap-${Math.random().toString(36).substr(2, 9)}`,
                metadata: newTrapMetadata,
                signature
            };
            setTraps(prev => [newTrap, ...prev]);
            addLocalLog('QKD', 'NOMINAL', `Canary token signed: ${newTrap.id}`);
            playSystemVoice('Canary token signed with ML-DSA.');

            // Log to visual PQC audit history
            try {
                const sigHex = PQCService.toHex(signature);
                const pubHex = PQCService.toHex(pqcKeys.publicKey);
                const hash = await PqcAuditService.computeSha256(newTrapMetadata);
                const fp = PqcAuditService.computeFingerprintFromHex(pubHex, 'ML-DSA-65');
                PqcAuditService.addAuditLog({
                    id: `PQC-${newTrap.id.toUpperCase()}`,
                    timestamp: new Date().toISOString(),
                    algorithm: 'ML-DSA-65',
                    action: 'CANARY_TRAP_SIGNED',
                    payload: newTrapMetadata,
                    payloadHash: hash,
                    signatureHex: sigHex,
                    signatureBytes: signature.length,
                    publicKeyFingerprint: fp,
                    publicKeyHex: pubHex,
                    verificationStatus: 'VERIFIED_VALID',
                    verifiedAt: new Date().toISOString(),
                    operator: 'QUANTUM_TRAP_AGENT',
                    missionContext: `Canary Honeypot Token (${newTrap.id})`,
                    metadata: {
                        trapId: newTrap.id
                    }
                });
            } catch (auditErr) {
                console.warn("Could not log trap to PQC audit", auditErr);
            }
        } catch (err) {
            addLocalLog('QKD', 'CRITICAL', 'PQC signing failure.');
        }
    };

    const handleVerifyTrap = async (trapId: string) => {
        if (!pqcKeys) return;
        const trap = traps.find(t => t.id === trapId);
        if (!trap) return;

        const isValid = PQCService.verify(trap.metadata, trap.signature, pqcKeys.publicKey);
        setTraps(prev => prev.map(t => t.id === trapId ? { ...t, verified: isValid } : t));
        
        // Update audit history verification status
        try {
            const auditId = `PQC-${trapId.toUpperCase()}`;
            PqcAuditService.updateAuditLog(auditId, {
                verificationStatus: isValid ? 'VERIFIED_VALID' : 'TAMPER_DETECTED',
                verifiedAt: new Date().toISOString()
            });
        } catch (err) {
            console.warn("Could not update audit log status", err);
        }

        if (isValid) {
            addLocalLog('QKD', 'NOMINAL', `Trap ${trapId} integrity verified.`);
            playSystemVoice('Trap integrity verified.');
        } else {
            addLocalLog('QKD', 'CRITICAL', `Trap ${trapId} INTEGRITY BREACH!`);
            playSystemVoice('Warning. Trap integrity breach detected.');
        }
    };

    const runGroverSimulation = () => {
        setIsGroverRunning(true);
        setGroverStep(0);
        setGroverProbabilities([0.25, 0.25, 0.25, 0.25]);
        addLocalLog('QKD', 'NOMINAL', 'Initializing Grover Search: 2-qubit superposition.');
        playSystemVoice('Initializing quantum search algorithm.');

        // Step 1: Oracle (Marking)
        setTimeout(() => {
            setGroverStep(1);
            addLocalLog('QKD', 'NOMINAL', `Oracle phase: Marking target state |${targetState}>.`);
            playSystemVoice('Applying quantum oracle.');
        }, 1500);

        // Step 2: Diffuser (Amplification)
        setTimeout(() => {
            setGroverStep(2);
            const probs = [0.0625, 0.0625, 0.0625, 0.0625];
            const targetIdx = parseInt(targetState, 2);
            probs[targetIdx] = 0.8125; // Probability amplification
            setGroverProbabilities(probs);
            addLocalLog('QKD', 'NOMINAL', 'Diffuser phase: Probability amplification complete.');
            playSystemVoice('Probability amplification successful.');
        }, 3000);

        // Step 3: Measurement
        setTimeout(() => {
            setGroverStep(3);
            addLocalLog('QKD', 'SUCCESS', `Grover identified target state |${targetState}> with 81.25% probability.`);
            playSystemVoice(`Quantum search complete. Target state ${targetState} identified.`);
            setIsGroverRunning(false);
        }, 4500);
    };

    const handleDownloadQuantumLog = () => {
        if (eventLog.length === 0) return;
        const keysText = pqcKeys ? `ML-DSA-65 PUBLIC KEY:\n${PQCService.toHex(pqcKeys.publicKey)}\n\nCANARY SIGNATURES:\n` + traps.map(t => `- ID: ${t.id} | VERIFIED: ${t.verified ?? 'PENDING'}\n  METADATA: ${t.metadata}\n  SIG: ${PQCService.toHex(t.signature)}`).join('\n') : 'NO_PQC_KEYS_GENERATED';

        const data = `--- QUANTUM SECUREMENT DISCOVERY REPORT ---\n` +
          `TIMESTAMP: ${new Date().toLocaleString()}\n` +
          `QKD STATUS: ${effectiveQkdStatus}\n` +
          `VACUUM FLUCTUATIONS: ${vacuumFluctuation.toFixed(4)} eV\n` +
          `AETHER SATURATION: ${(aetherSaturation * 100).toFixed(1)}%\n` +
          `-----------------------------------------\n\n` +
          `=== POST-QUANTUM KEY STORE ===\n` +
          keysText + `\n\n` +
          `=== SUB-SPACE TELEMETRY LOGS ===\n` +
          eventLog.map(log => `[${log.timestamp}] [${log.type}] [${log.severity}] ${log.message}`).join('\n') +
          `\n\n[EOF: SECURE TELEMETRY MAP]`;

        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `QUANTUM_DEFENSE_STATUS_${new Date().getTime()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700 ${isCritical ? 'breach-active' : ''}`}>
            <div className="lg:col-span-1 space-y-6">
                <div className={`glass p-6 rounded-2xl border transition-all duration-500 relative overflow-hidden ${isCritical ? 'border-red-500 bg-red-950/20' : 'border-slate-800'}`}>
                    <canvas ref={aetherCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40" width="300" height="200" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4 relative z-10">Advanced Physics Core</h3>
                    <div className="flex flex-col items-center justify-center space-y-6 py-4 relative z-10">
                        <div className={`text-center font-black mono text-xl uppercase transition-colors ${statusConfig[effectiveQkdStatus].color} ${statusConfig[effectiveQkdStatus].pulse ? 'animate-pulse' : ''}`}>
                           {statusConfig[effectiveQkdStatus].label}
                        </div>
                        
                        <div className="w-full grid grid-cols-2 gap-4">
                           <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                              <span className="text-[7px] text-slate-500 block uppercase">Vacuum Fluctuations</span>
                              <span className="text-[10px] text-cyan-400 font-bold mono">{vacuumFluctuation.toFixed(4)} eV</span>
                           </div>
                           <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                              <span className="text-[7px] text-slate-500 block uppercase">Aether Saturation</span>
                              <span className="text-[10px] text-purple-400 font-bold mono">{(aetherSaturation * 100).toFixed(1)}%</span>
                           </div>
                        </div>

                        {syncPhase && (
                            <div className="w-full space-y-2">
                                <div className="flex justify-between text-[8px] font-black text-amber-500 mono animate-pulse">
                                    <span>{syncPhase}</span>
                                </div>
                                <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 animate-quantum-progress"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass p-6 rounded-2xl border border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-1">Entanglement Controls</h3>
                    <button 
                        onClick={() => handleQkdSync()} 
                        disabled={effectiveQkdStatus === 'SYNCING' || isStealthMode}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95"
                    >
                        {effectiveQkdStatus === 'SYNCING' ? 'Synchronizing Waves...' : 'Initiate Entanglement'}
                    </button>
                    <button 
                        onClick={toggleAetherModulator}
                        className="w-full border border-purple-500/30 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 font-black py-3 rounded-xl uppercase tracking-widest text-[9px] transition-all"
                    >
                        Cycle Aether Resonance
                    </button>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <div className="glass p-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/80 to-purple-900/10">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Sub-Space Parameters</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Aether Flux Density</span>
                              <span className="text-[9px] text-purple-400 mono">{(aetherSaturation * 0.85).toFixed(3)} ηT</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 transition-all duration-1000" style={{width: `${aetherSaturation * 100}%`}}></div>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Casimir Effect Margin</span>
                              <span className="text-[9px] text-cyan-400 mono">{(1 - vacuumFluctuation/2).toFixed(3)} μN</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500 transition-all duration-1000" style={{width: `${(1 - vacuumFluctuation/2) * 100}%`}}></div>
                           </div>
                        </div>
                        
                        <div className="pt-4 grid grid-cols-2 gap-3">
                           <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col items-center text-center">
                              <span className="text-[7px] text-slate-500 uppercase font-black mb-1">Zero-Point Stability</span>
                              <span className="text-[10px] text-green-400 font-bold uppercase">HIGH_GRID</span>
                           </div>
                           <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col items-center text-center">
                              <span className="text-[7px] text-slate-500 uppercase font-black mb-1">FTL Parity</span>
                              <span className="text-[10px] text-cyan-400 font-bold uppercase">ACTIVE</span>
                           </div>
                        </div>
                    </div>
                </div>
                
                {isCritical && (
                    <div className="bg-red-600/20 border border-red-500 p-4 rounded-xl animate-pulse flex items-center space-x-3">
                       <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                       <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">WAVEFUNCTION_COLLAPSE_DETECTED</span>
                    </div>
                )}
            </div>

            <div className="lg:col-span-1 glass p-4 rounded-2xl border border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-900/40 mb-3 flex items-center justify-between">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">PQC Trap Management</h3>
                   <div className={`w-2 h-2 rounded-full ${pqcKeys ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                </div>
                
                <div className="space-y-4 p-2">
                    {!pqcKeys ? (
                        <button 
                            onClick={handleGeneratePQCKeys}
                            disabled={isGeneratingKeys}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-black py-3 rounded-xl uppercase tracking-widest transition-all"
                        >
                            {isGeneratingKeys ? 'Generating ML-DSA-65...' : 'Generate PQC Keypair'}
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-[7px] text-slate-500 uppercase block mb-1">Public Key (ML-DSA-65)</span>
                                <span className="text-[8px] text-purple-400 mono break-all">{PQCService.toHex(pqcKeys.publicKey).substring(0, 64)}...</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Trap Metadata</label>
                                <textarea 
                                    value={newTrapMetadata}
                                    onChange={e => setNewTrapMetadata(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] text-white mono outline-none focus:border-purple-500 min-h-[60px] resize-none"
                                />
                                <button 
                                    onClick={handleSignTrap}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-[9px] font-black py-2 rounded-lg uppercase tracking-widest transition-all"
                                >
                                    Sign Canary Token
                                </button>
                            </div>

                            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                                {traps.map(trap => (
                                    <div key={trap.id} className="p-2 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between group">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-white uppercase">{trap.id}</span>
                                            <span className="text-[7px] text-slate-500 truncate w-32">{trap.metadata}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {trap.verified !== undefined && (
                                                <span className={`text-[7px] font-black ${trap.verified ? 'text-green-500' : 'text-red-500'}`}>
                                                    {trap.verified ? 'VERIFIED' : 'BREACHED'}
                                                </span>
                                            )}
                                            <button 
                                                onClick={() => handleVerifyTrap(trap.id)}
                                                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-cyan-400 transition-all"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-1 glass p-4 rounded-2xl border border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-900/40 mb-3 flex items-center justify-between">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantum Search (Grover)</h3>
                   <div className={`w-2 h-2 rounded-full ${isGroverRunning ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700'}`}></div>
                </div>
                
                <div className="flex-grow p-2 space-y-6">
                    <div className="grid grid-cols-4 gap-2 items-end h-32 bg-slate-950/40 rounded-xl p-4 border border-slate-900">
                        {groverProbabilities.map((p, i) => (
                            <div key={i} className="flex flex-col items-center space-y-2">
                                <div 
                                    className={`w-full rounded-t-sm transition-all duration-1000 ${i === parseInt(targetState, 2) ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-800'}`}
                                    style={{ height: `${p * 100}%` }}
                                />
                                <span className="text-[7px] font-black text-slate-500 mono">|{i.toString(2).padStart(2, '0')}{'>'}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[8px] font-black text-slate-500 uppercase">Target State</span>
                            <select 
                                value={targetState}
                                onChange={(e) => setTargetState(e.target.value)}
                                disabled={isGroverRunning}
                                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[9px] text-cyan-400 mono outline-none"
                            >
                                <option value="00">|00{'>'}</option>
                                <option value="01">|01{'>'}</option>
                                <option value="10">|10{'>'}</option>
                                <option value="11">|11{'>'}</option>
                            </select>
                        </div>

                        <button 
                            onClick={runGroverSimulation}
                            disabled={isGroverRunning}
                            className="w-full bg-slate-900 hover:bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-black py-3 rounded-xl uppercase tracking-widest transition-all active:scale-95"
                        >
                            {isGroverRunning ? 'Amplifying Waves...' : 'Run Grover Search'}
                        </button>

                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                            <div className="flex justify-between text-[7px] font-black text-slate-500 uppercase mb-2">
                                <span>Algorithm Phase</span>
                                <span className="text-cyan-500">{groverStep === 0 ? 'IDLE' : groverStep === 1 ? 'ORACLE' : groverStep === 2 ? 'DIFFUSER' : 'MEASURED'}</span>
                            </div>
                            <div className="flex space-x-1">
                                {[0, 1, 2, 3].map(s => (
                                    <div key={s} className={`h-1 flex-grow rounded-full transition-colors ${s <= groverStep ? 'bg-cyan-500' : 'bg-slate-800'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 glass p-4 rounded-2xl border border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-900/40 mb-3 flex items-center justify-between">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sub-Space Telemetry</h3>
                   <div className="flex items-center space-x-2">
                       {eventLog.length > 0 && (
                           <button 
                              onClick={handleDownloadQuantumLog} 
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded text-[8.5px] font-black uppercase tracking-widest transition-all mr-1"
                           >
                              DOWNLOAD_LOG
                           </button>
                       )}
                       <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                   </div>
                </div>
                <div className="flex-grow overflow-y-auto h-80 scrollbar-hide bg-slate-950/50 rounded-xl p-3 space-y-2">
                    {eventLog.map(log => (
                        <div key={log.id} className="text-[9px] mono flex border-l border-slate-900 pl-3 py-1 hover:bg-white/5 transition-colors">
                            <span className="text-slate-600 mr-2 shrink-0">[{log.timestamp}]</span>
                            <span className={`${log.severity === 'CRITICAL' ? 'text-red-500 font-bold' : log.severity === 'SUCCESS' ? 'text-green-400 font-bold' : log.severity === 'WARNING' ? 'text-amber-400' : (log.type === 'AETHER' ? 'text-purple-400' : 'text-slate-400')}`}>
                                <span className="font-bold">[{log.type}]</span> {log.message}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes quantum-progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                .animate-quantum-progress {
                    animation: quantum-progress 3.6s linear forwards;
                }
                .breach-active {
                    animation: breach-shake 0.2s infinite;
                }
                @keyframes breach-shake {
                    0% { transform: translate(0, 0); }
                    50% { transform: translate(1px, 1px); }
                    100% { transform: translate(0, 0); }
                }
            `}</style>
        </div>
    );
};

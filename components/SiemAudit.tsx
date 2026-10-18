
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AuditLog {
    id: string;
    timestamp: string;
    component: 'SIEM' | 'EDR' | 'DPI';
    severity: 'INFO' | 'WARN' | 'CRITICAL';
    message: string;
}

interface SensorData {
    fecDegradation: number;
    eirpSaturation: number;
    packetInjectionRisk: number;
    terminalIntegrity: 'NOMINAL' | 'DEGRADED' | 'BREACHED';
}

export const SiemAudit: React.FC<{ 
    isJamming: boolean, 
    jammingPower: number,
    onArchiveIntel?: (intel: { time: string, src: string, dst: string, data: string }) => void,
    onNavigatePqcAudit?: () => void
}> = ({ isJamming, jammingPower, onArchiveIntel, onNavigatePqcAudit }) => {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
        { id: 'audit-init-2', timestamp: new Date().toLocaleTimeString([], { hour12: false }), component: 'SIEM', severity: 'INFO', message: 'Network interface monitoring daemon registered.' },
        { id: 'audit-init-1', timestamp: new Date().toLocaleTimeString([], { hour12: false }), component: 'EDR', severity: 'INFO', message: 'Cryptographic core sandbox verification verified.' }
    ]);
    const [isAuditing, setIsAuditing] = useState(false);
    const [sensorData, setSensorData] = useState<SensorData>({
        fecDegradation: 0.1,
        eirpSaturation: 42,
        packetInjectionRisk: 2,
        terminalIntegrity: 'NOMINAL'
    });

    const handleDownloadAuditReport = () => {
        if (auditLogs.length === 0) return;
        const data = `--- SIEM / EDR OVERSIGHT SECURITY AUDIT REPORT ---\n` +
          `TIMESTAMP: ${new Date().toLocaleString()}\n` +
          `TERMINAL INTEGRITY: ${sensorData.terminalIntegrity}\n` +
          `FEC DEGRADATION: ${sensorData.fecDegradation.toFixed(2)} dB\n` +
          `EIRP SATURATION: ${sensorData.eirpSaturation.toFixed(1)}%\n` +
          `PACKET INJECTION RISK: ${sensorData.packetInjectionRisk.toFixed(1)}%\n` +
          `--------------------------------------------------\n\n` +
          `=== DISCOVERED SYSTEM VULNERABILITIES & RECON EVENTS ===\n` +
          auditLogs.map(log => `[${log.timestamp}] [${log.component}] [${log.severity}] ${log.message}`).join('\n') +
          `\n\n[EOF: SECURITY AUDIT DIRECTIVE]`;

        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SIEM_SECURITY_AUDIT_REPORT_${new Date().getTime()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const addLog = useCallback((component: AuditLog['component'], severity: AuditLog['severity'], message: string) => {
        const newLog: AuditLog = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            component,
            severity,
            message
        };
        setAuditLogs(prev => [newLog, ...prev].slice(0, 50));
    }, []);

    const runAudit = async () => {
        setIsAuditing(true);
        addLog('SIEM', 'INFO', 'Initiating ingress traffic query for AFRINIC subnets...');
        
        await new Promise(r => setTimeout(r, 1200));
        addLog('SIEM', 'WARN', 'Unauthorized port scanning detected from 41.0.0.0/8 range.');
        addLog('SIEM', 'CRITICAL', 'Potential payload delivery attempt matching AFRINIC signature 18:53:53.');

        await new Promise(r => setTimeout(r, 800));
        addLog('EDR', 'INFO', 'Executing localized sweep on target assets...');
        addLog('EDR', 'WARN', 'Anomalous SSH activity detected on node-A3. Outbound beaconing suspected.');

        await new Promise(r => setTimeout(r, 1000));
        addLog('DPI', 'INFO', 'Analyzing edge-router PCAP data...');
        addLog('DPI', 'CRITICAL', 'Unauthorized encrypted tunnel detected. Potential C2 callback bypassing primary firewall.');
        
        setIsAuditing(false);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setSensorData(prev => {
                let fec = isJamming ? (jammingPower / 10) + Math.random() : 0.1 + (Math.random() * 0.1);
                let eirp = 42 + (isJamming ? (jammingPower / 2) : 0) + (Math.random() * 2);
                let risk = isJamming ? (jammingPower / 4) + Math.random() : (Math.random() * 5);
                
                let integrity: SensorData['terminalIntegrity'] = 'NOMINAL';
                if (fec > 8 || risk > 20) integrity = 'DEGRADED';
                if (fec > 15 || risk > 40) integrity = 'BREACHED';

                return {
                    fecDegradation: Math.min(100, fec),
                    eirpSaturation: Math.min(100, eirp),
                    packetInjectionRisk: Math.min(100, risk),
                    terminalIntegrity: integrity
                };
            });
        }, 2000);
        return () => clearInterval(interval);
    }, [isJamming, jammingPower]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
            {/* Left Panel: Audit Controls and Logs */}
            <div className="lg:col-span-8 space-y-6">
                <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/40">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                                <span className="mr-3">🛡️</span> SIEM / EDR OVERSIGHT
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                Secure Infrastructure & Endpoint Audit Terminal
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            {onNavigatePqcAudit && (
                                <button
                                    onClick={onNavigatePqcAudit}
                                    className="px-4 py-3 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                >
                                    <span>🛡️</span> PQC_SIGNATURES
                                </button>
                            )}
                            {auditLogs.length > 0 && (
                                <button 
                                    onClick={handleDownloadAuditReport}
                                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                                >
                                    DOWNLOAD_REPORT
                                </button>
                            )}
                            <button 
                                onClick={runAudit}
                                disabled={isAuditing}
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isAuditing 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                    : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 active:scale-95'
                                }`}
                            >
                                {isAuditing ? 'AUDITING...' : 'INITIATE_FULL_AUDIT'}
                            </button>
                        </div>
                    </div>

                    <div className="h-96 overflow-y-auto bg-slate-950 rounded-2xl p-4 font-mono text-[11px] space-y-2 border border-slate-800 scrollbar-hide">
                        {auditLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-40 italic">
                                <span>No audit logs present. Initiate audit to sweep system.</span>
                            </div>
                        ) : (
                            auditLogs.map(log => (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }}
                                    key={log.id} 
                                    className="flex items-start space-x-3 py-1 border-b border-white/5 last:border-none"
                                >
                                    <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                                    <span className={`font-black shrink-0 ${
                                        log.severity === 'CRITICAL' ? 'text-red-500' : 
                                        log.severity === 'WARN' ? 'text-amber-500' : 'text-blue-500'
                                    }`}>[{log.component}]</span>
                                    <span className={log.severity === 'CRITICAL' ? 'text-red-400 font-bold' : 'text-slate-300'}>
                                        {log.message}
                                    </span>
                                    {log.severity === 'CRITICAL' && onArchiveIntel && (
                                        <button 
                                            onClick={() => onArchiveIntel({ 
                                                time: log.timestamp, 
                                                src: log.component, 
                                                dst: 'SIEM_VAULT', 
                                                data: log.message 
                                            })}
                                            className="ml-auto text-[8px] bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded uppercase font-black hover:bg-red-500/40 transition-all active:scale-90"
                                        >
                                            ARCHIVE
                                        </button>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel: VSAT Terminal Sensors */}
            <div className="lg:col-span-4 space-y-6">
                <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/40">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-800 pb-3">
                        VSAT TERMINAL SENSORS
                    </h3>
                    
                    <div className="space-y-6">
                        {/* Terminal Integrity */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Terminal_Integrity</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    sensorData.terminalIntegrity === 'NOMINAL' ? 'bg-green-500/20 text-green-500' :
                                    sensorData.terminalIntegrity === 'DEGRADED' ? 'bg-amber-500/20 text-amber-500' :
                                    'bg-red-500/20 text-red-500 animate-pulse'
                                }`}>
                                    {sensorData.terminalIntegrity}
                                </span>
                            </div>
                        </div>

                        {/* FEC Degradation */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-bold uppercase mono">
                                <span className="text-slate-500">FEC Degradation (dB)</span>
                                <span className={sensorData.fecDegradation > 5 ? 'text-red-500' : 'text-cyan-400'}>
                                    {sensorData.fecDegradation.toFixed(2)}
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${
                                        sensorData.fecDegradation > 8 ? 'bg-red-500' : 'bg-cyan-500'
                                    }`}
                                    style={{ width: `${Math.min(100, sensorData.fecDegradation * 10)}%` }}
                                />
                            </div>
                        </div>

                        {/* EIRP Saturation */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-bold uppercase mono">
                                <span className="text-slate-500">EIRP Saturation (%)</span>
                                <span className={sensorData.eirpSaturation > 80 ? 'text-red-500' : 'text-cyan-400'}>
                                    {sensorData.eirpSaturation.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${
                                        sensorData.eirpSaturation > 80 ? 'bg-red-500' : 'bg-cyan-500'
                                    }`}
                                    style={{ width: `${sensorData.eirpSaturation}%` }}
                                />
                            </div>
                        </div>

                        {/* Packet Injection Risk */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-bold uppercase mono">
                                <span className="text-slate-500">Packet Injection Risk</span>
                                <span className={sensorData.packetInjectionRisk > 20 ? 'text-red-500 font-bold' : 'text-cyan-400'}>
                                    {sensorData.packetInjectionRisk.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${
                                        sensorData.packetInjectionRisk > 20 ? 'bg-red-500' : 'bg-cyan-500'
                                    }`}
                                    style={{ width: `${sensorData.packetInjectionRisk}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                        <div className="flex items-center space-x-2 mb-3">
                            <span className="text-cyan-500 text-xs">ℹ️</span>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Technical Advisory: RF_ASSESSMENT</span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic font-mono leading-relaxed">
                            Monitoring terminal for physical compromise via Aetheric sensors. EW_JAMMING detected at {jammingPower}% intensity. 
                        </p>
                        
                        <div className={`mt-4 p-3 rounded-xl border ${sensorData.fecDegradation > 12 || sensorData.packetInjectionRisk > 35 ? 'bg-red-500/10 border-red-500/30' : 'bg-cyan-500/5 border-cyan-500/20'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-2">
                                {sensorData.fecDegradation > 12 || sensorData.packetInjectionRisk > 35 ? 
                                    '🚩 COMPROMISE_RECON: ACTION REQUIRED' : '✅ UPLINK_STABILITY: NOMINAL'}
                            </p>
                            <p className="text-[9px] text-slate-400 leading-normal">
                                {sensorData.fecDegradation > 12 || sensorData.packetInjectionRisk > 35 ? 
                                    `CRITICAL: Uplink performance showing non-linear FEC degradation (${sensorData.fecDegradation.toFixed(1)}dB). Rule out physical terminal compromise immediately. Physical hardware inspection recommended to clear EIRP saturation artifacts.` :
                                    "FEC and EIRP levels are within anticipated interference envelopes. physical terminal compromise is unlikely. Malicious packet injection masked by EW_JAMMING is currently below 5% probability threshold."
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

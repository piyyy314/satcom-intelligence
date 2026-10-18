
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';

interface DarkLinkProps {
    isActive: boolean;
    setIsActive: (val: boolean) => void;
}

interface MeshNode {
    id: string;
    callsign: string;
    role: 'Gateway' | 'Relay' | 'Edge' | 'Mobile';
    status: 'ONLINE' | 'DEGRADED' | 'DIRECT';
    rssi: number; // in dBm
    snr: number;  // in dB
    hops: number;
    latency: number; // in ms
    battery: number; // %
    frequency: string; // e.g., "915.0 MHz"
    lastSeen: string;
    macAddress: string;
    firmwareVersion: string;
    chipset: string;
    txPower: string;
    packetLoss: number; // %
    diagnosticNote?: string;
}

export const DarkLink: React.FC<DarkLinkProps> = ({ isActive, setIsActive }) => {
    const [localStatus, setLocalStatus] = useState<"DISCONNECTED" | "CONNECTING" | "ERROR">("DISCONNECTED");
    const [error, setError] = useState<string | null>(null);
    const [port, setPort] = useState<any>(null);
    const [logs, setLogs] = useState<{timestamp: string, msg: string}[]>([]);
    const [selectedNode, setSelectedNode] = useState<MeshNode | null>(null);
    const [pingingNodeId, setPingingNodeId] = useState<string | null>(null);
    const [copiedMac, setCopiedMac] = useState<boolean>(false);

    // Meshtastic Mesh Hardening State
    const [activeTab, setActiveTab] = useState<'topology' | 'hardening'>('topology');
    const [channelName, setChannelName] = useState<string>("LongFast");
    const [pskKey, setPskKey] = useState<string>("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    const [pskRotated, setPskRotated] = useState<boolean>(false);
    const [fixedPosition, setFixedPosition] = useState<boolean>(true);
    const [positionOffset, setPositionOffset] = useState<boolean>(false);
    const [adminLockEnabled, setAdminLockEnabled] = useState<boolean>(false);
    const [adminPassword, setAdminPassword] = useState<string>("TAC-ADMIN-8821");
    const [broadcastInterval, setBroadcastInterval] = useState<number>(5); // in minutes
    const [hopLimit, setHopLimit] = useState<number>(7);
    const [silenceMode, setSilenceMode] = useState<boolean>(false);
    const [yagiAntennaEnabled, setYagiAntennaEnabled] = useState<boolean>(false);

    // Simulated OTA Firmware Flashing State
    const [selectedFirmware, setSelectedFirmware] = useState<string>("v2.5.4-SECURE-HARDENED");
    const [flashingNodeId, setFlashingNodeId] = useState<string | null>(null);
    const [flashProgress, setFlashProgress] = useState<number>(0);
    const [flashStep, setFlashStep] = useState<string>("");
    const [flashComplete, setFlashComplete] = useState<boolean>(false);

    // Initial Mesh Nodes state
    const [nodes, setNodes] = useState<MeshNode[]>([
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
            firmwareVersion: "v2.4.12-mesh-release",
            chipset: "ESP32-S3-WROOM-1 / SX1262",
            txPower: "27 dBm (500 mW)",
            packetLoss: 0.1
        },
        { 
            id: "0x89B2", 
            callsign: "RELAY-BRAVO", 
            role: "Relay", 
            status: "DIRECT", 
            rssi: -82, 
            snr: 8.1, 
            hops: 1, 
            latency: 26, 
            battery: 84, 
            frequency: "915.0 MHz", 
            lastSeen: "2s ago",
            macAddress: "58:CF:79:88:B2:C4",
            firmwareVersion: "v2.4.10-mesh-release",
            chipset: "nRF52840 / SX1262",
            txPower: "22 dBm (160 mW)",
            packetLoss: 0.8
        },
        { 
            id: "0x11C3", 
            callsign: "PATROL-CHARLIE", 
            role: "Mobile", 
            status: "ONLINE", 
            rssi: -94, 
            snr: 4.2, 
            hops: 2, 
            latency: 62, 
            battery: 67, 
            frequency: "915.0 MHz", 
            lastSeen: "5s ago",
            macAddress: "90:E2:BA:44:C3:D1",
            firmwareVersion: "v2.4.12-mesh-release",
            chipset: "RP2040 / SX1262",
            txPower: "20 dBm (100 mW)",
            packetLoss: 2.4
        },
        { 
            id: "0x77D4", 
            callsign: "OUTPOST-DELTA", 
            role: "Relay", 
            status: "DEGRADED", 
            rssi: -112, 
            snr: -2.1, 
            hops: 3, 
            latency: 139, 
            battery: 42, 
            frequency: "915.0 MHz", 
            lastSeen: "12s ago",
            macAddress: "70:B3:D5:77:D4:E9",
            firmwareVersion: "v2.3.8-mesh-legacy",
            chipset: "nRF52840 / SX1262",
            txPower: "20 dBm (100 mW)",
            packetLoss: 18.4,
            diagnosticNote: "The Outpost-Delta node is at the limit of its effective range. With an RSSI of -112 dBm and a negative SNR (-2.1 dB), the signal is nearing the noise floor. The 139ms RTT over 3 hops suggests a high probability of packet loss; consider repositioning Relay-Bravo or adding another hop to stabilize the link."
        },
        { 
            id: "0x99E5", 
            callsign: "GHOST-ECHO", 
            role: "Edge", 
            status: "ONLINE", 
            rssi: -89, 
            snr: 6.8, 
            hops: 2, 
            latency: 85, 
            battery: 91, 
            frequency: "915.0 MHz", 
            lastSeen: "1s ago",
            macAddress: "E4:5F:01:99:E5:F8",
            firmwareVersion: "v2.4.12-mesh-release",
            chipset: "ESP32-D0WD-V3 / SX1268",
            txPower: "17 dBm (50 mW)",
            packetLoss: 0.6
        }
    ]);

    const status = isActive ? "ACTIVE" : localStatus;

    // Periodically update telemetry metrics slightly when link is active
    useEffect(() => {
        if (status !== 'ACTIVE') return;

        const interval = setInterval(() => {
            setNodes(prevNodes => prevNodes.map(node => {
                const rssiDelta = Math.floor(Math.random() * 5) - 2;
                const latencyDelta = Math.floor(Math.random() * 7) - 3;
                const newRssi = Math.max(-120, Math.min(-55, node.rssi + rssiDelta));
                const newLatency = Math.max(8, node.latency + latencyDelta);
                return {
                    ...node,
                    rssi: newRssi,
                    latency: newLatency,
                    status: newRssi < -102 ? 'DEGRADED' : node.hops === 1 ? 'DIRECT' : 'ONLINE'
                };
            }));
        }, 4000);

        return () => clearInterval(interval);
    }, [status]);

    const addLog = (msg: string) => {
        setLogs(prev => [{
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            msg
        }, ...prev].slice(0, 50));
    };

    const [isSimulated, setIsSimulated] = useState(false);

    const activateDarkLink = async (simulate = false) => {
        setLocalStatus("CONNECTING");
        setError(null);
        addLog(simulate ? "INITIATING VIRTUAL DARK-LINK [SIMULATION]..." : "INITIATING DARK-LINK PROTOCOL...");
        
        if (simulate) {
            setIsSimulated(true);
            setTimeout(() => {
                setIsActive(true);
                addLog("VIRTUAL MESH INITIALIZED. SIMULATED BYPASS ACTIVE.");
                addLog("GATEWAY: VIRTUAL_NODE_LOGIC.ALPHA");
            }, 1000);
            return;
        }

        try {
            // Check if Web Serial is supported
            if (!('serial' in navigator)) {
                throw new Error("WEB_SERIAL_NOT_SUPPORTED");
            }

            // Request access to the LoRa/Meshtastic device via USB
            const selectedPort = await (navigator as any).serial.requestPort();
            await selectedPort.open({ baudRate: 115200 });
            
            setPort(selectedPort);
            setIsActive(true);
            addLog("MESH-NET INITIALIZED. BYPASSING ISP.");
            addLog("HARDWARE_HANDSHAKE: SUCCESS");
        } catch (e: any) {
            console.warn("Off-Grid Hardware connection status info:", e);
            setLocalStatus("ERROR");
            if (e.name === 'NotFoundError') {
                setError("HARDWARE_NOT_FOUND: No device selected.");
                addLog("ERROR: DEVICE_SELECTION_CANCELLED");
            } else if (e.name === 'SecurityError' || e.message?.includes('permissions policy')) {
                setError("PERMISSION_DENIED: Serial access blocked by system policy.");
                addLog("ERROR: PERMISSION_SECURITY_VIOLATION");
            } else if (e.message === "WEB_SERIAL_NOT_SUPPORTED") {
                setError("BROWSER_UNSUPPORTED: Web Serial API not available.");
                addLog("ERROR: API_UNAVAILABLE");
            } else {
                setError("CONNECTION_FAILURE: Off-grid hardware not detected or busy.");
                addLog("ERROR: UPLINK_TIMEOUT");
            }
        }
    };

    const disconnect = async () => {
        if (port) {
            try {
                await port.close();
            } catch (e) {
                console.error("Error closing port", e);
            }
            setPort(null);
        }
        setIsActive(false);
        setIsSimulated(false);
        setLocalStatus("DISCONNECTED");
        addLog("DARK-LINK DEACTIVATED. RETURNING TO STANDARD COMMS.");
    };

    const [message, setMessage] = useState("");

    const sendMessage = async () => {
        if (!message) return;
        addLog(`TX_SEND: ${message}`);
        setMessage("");

        if (isSimulated) {
            setTimeout(() => {
                const responses = [
                    "VIRTUAL_MESH: ACKNOWLEDGEMENT_RECEIVED",
                    "ALPHA_NODE: PARITY_MATCH_CONFIRMED",
                    "GHOST_NET: ROUTING_PACKET_THROUGH_P2P_LAYER",
                    "REPLY_FROM_0x42: ROLLING_CODE_ACCEPTED"
                ];
                addLog(`RX_RECV: ${responses[Math.floor(Math.random() * responses.length)]}`);
            }, 800);
        } else if (port) {
            // Real Serial transmission would go here
            try {
                const encoder = new TextEncoder();
                const writer = port.writable.getWriter();
                await writer.write(encoder.encode(message + "\n"));
                writer.releaseLock();
                addLog("TX_BUFFER: FLUSHED_TO_HARDWARE");
            } catch (e) {
                addLog("TX_ERROR: HARDWARE_LINK_INTERRUPTED");
            }
        }
    };

    const handlePingNode = (node: MeshNode) => {
        setPingingNodeId(node.id);
        addLog(`ICMP_ECHO_REQ: Pinging node ${node.callsign} (${node.id}) via ${node.hops} hop(s)...`);
        
        setTimeout(() => {
            const latencyJitter = Math.floor(Math.random() * 8) - 4;
            const finalLatency = Math.max(5, node.latency + latencyJitter);
            addLog(`ICMP_ECHO_REPLY: ${node.callsign} [${node.id}] - RSSI: ${node.rssi}dBm | SNR: ${node.snr}dB | RTT: ${finalLatency}ms`);
            setPingingNodeId(null);
            
            // update node in state
            setNodes(prev => prev.map(n => n.id === node.id ? { ...n, latency: finalLatency, lastSeen: "JUST NOW" } : n));
        }, 600);
    };

    const handleCopyMac = (mac: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(mac);
        }
        setCopiedMac(true);
        addLog(`COPIED MAC ADDRESS: ${mac}`);
        setTimeout(() => setCopiedMac(false), 2000);
    };

    const handleStabilizeLink = (nodeId: string) => {
        addLog(`ROUTING_OPTIMIZER: Initiating link stabilization for ${nodeId}...`);
        addLog(`COMMAND: Recalibrating Relay-Bravo tx_power (+3dBm) & deploying intermediate hop...`);
        
        setTimeout(() => {
            setNodes(prev => prev.map(n => {
                if (n.id === nodeId) {
                    return {
                        ...n,
                        rssi: -98,
                        snr: 3.5,
                        latency: 78,
                        hops: 2,
                        packetLoss: 2.1,
                        status: 'ONLINE',
                        diagnosticNote: "Link stabilized. Relay-Bravo tx_power increased and dynamic hop rerouting active."
                    };
                }
                return n;
            }));
            addLog(`LINK_STABILIZED: ${nodeId} signal quality restored to -98 dBm / 3.5 dB SNR.`);
        }, 1200);
    };

    const handleSaveChannelName = (name: string) => {
        if (!name.trim()) return;
        setChannelName(name);
        addLog(`CHANNEL_CONFIG: Changed mesh channel name from 'LongFast' to '${name}'. Avoids detection by standard scanners.`);
    };

    const handleRotatePsk = () => {
        const hex = Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setPskKey(hex);
        setPskRotated(true);
        addLog(`PSK_ROTATION: Generated new 256-bit PSK [${hex.substring(0, 12)}...]. All nodes updated over AES-256-GCM.`);
    };

    const handleToggleFixedPosition = () => {
        const next = !fixedPosition;
        setFixedPosition(next);
        addLog(`GPS_CONFIG: Fixed Position sharing toggled ${next ? 'ON' : 'OFF (Hardened)'}.`);
    };

    const handleTogglePositionOffset = () => {
        const next = !positionOffset;
        setPositionOffset(next);
        addLog(`GPS_CONFIG: Position Offset (Geoloc Mud) ${next ? 'ENABLED (+350m jitter shift)' : 'DISABLED'}.`);
    };

    const handleToggleAdminLock = () => {
        const next = !adminLockEnabled;
        setAdminLockEnabled(next);
        addLog(`DEVICE_SECURITY: Local Admin Lock ${next ? 'ENGAGED with password protection' : 'DISABLED'}.`);
    };

    const handleSetBroadcastInterval = (mins: number) => {
        setBroadcastInterval(mins);
        addLog(`RF_FOOTPRINT: Position & Telemetry Broadcast Interval set to ${mins} minutes (SIGINT dwell time minimized).`);
    };

    const handleSetHopLimit = (limit: number) => {
        setHopLimit(limit);
        addLog(`NETWORK_CONFIG: Restricted Hop-Limit to ${limit} across 915 MHz band.`);
    };

    const handleToggleSilenceMode = () => {
        const next = !silenceMode;
        setSilenceMode(next);
        addLog(`STEALTH_MODE: Silence / Quiet Mode ${next ? 'ENGAGED (Suppression of non-essential ACKs & node-info)' : 'DISENGAGED'}.`);
    };

    const handleToggleYagiAntenna = () => {
        const next = !yagiAntennaEnabled;
        setYagiAntennaEnabled(next);
        if (next) {
            setNodes(prev => prev.map(n => {
                if (n.id === "0x77D4") { // Outpost Delta
                    return {
                        ...n,
                        rssi: -92,
                        snr: 7.4,
                        latency: 48,
                        hops: 2,
                        packetLoss: 0.5,
                        status: 'ONLINE',
                        diagnosticNote: "Link stabilized via GW-ALPHA Directional Yagi beam steering (+12dBi gain margin)."
                    };
                }
                return n;
            }));
            addLog(`RF_BEAMFORMING: Directional Yagi 12dBi antenna engaged on GW-ALPHA targeting Outpost-Delta sector.`);
        } else {
            addLog(`RF_BEAMFORMING: Returned GW-ALPHA to Omni-3dBi antenna.`);
        }
    };

    const handleApplyFullHardeningProfile = () => {
        setChannelName("TAC-915-SECURE-ALPHA");
        handleRotatePsk();
        setFixedPosition(false);
        setPositionOffset(true);
        setAdminLockEnabled(true);
        setBroadcastInterval(30);
        setHopLimit(3);
        setSilenceMode(true);
        if (!yagiAntennaEnabled) {
            handleToggleYagiAntenna();
        }
        addLog(`FULL_MESH_HARDENING: Applied maximum security & RF footprint reduction profile across all nodes.`);
    };

    const handleStartOtaFlash = (nodeId: string, nodeCallsign: string) => {
        if (flashingNodeId) return;
        setFlashingNodeId(nodeId);
        setFlashProgress(0);
        setFlashComplete(false);
        setFlashStep(`Initiating secure AES-256-GCM OTA session with ${nodeCallsign}...`);
        addLog(`OTA_FLASH_START: Initiating remote OTA flashing sequence for ${nodeCallsign} [${nodeId}] -> Binary Target: ${selectedFirmware}`);

        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setFlashProgress(progress);

            if (progress === 20) {
                setFlashStep("1/4: Negotiating high-throughput LoRa chunk size (256-byte blocks)...");
            } else if (progress === 50) {
                setFlashStep("2/4: Pushing encrypted binary stream over mesh route...");
                addLog(`OTA_FLASH_STREAM: Transferred 50% firmware binary chunks to ${nodeCallsign}...`);
            } else if (progress === 80) {
                setFlashStep("3/4: Verifying SHA-256 integrity signature on node EEPROM...");
            } else if (progress >= 100) {
                clearInterval(interval);
                setFlashStep("4/4: Flashing partition complete! Rebooting node...");
                setFlashComplete(true);
                setFlashingNodeId(null);
                
                // Update node firmware in state
                setNodes(prev => prev.map(n => {
                    if (n.id === nodeId) {
                        return {
                            ...n,
                            firmwareVersion: selectedFirmware,
                            lastSeen: "JUST NOW"
                        };
                    }
                    return n;
                }));

                addLog(`OTA_FLASH_SUCCESS: ${nodeCallsign} updated to firmware ${selectedFirmware}. Heartbeat confirmed.`);
            }
        }, 500);
    };

    const handleDownloadLogs = () => {
        if (logs.length === 0) return;
        const data = `--- OFF-GRID MESH LINK SESSION LOGS ---\n` +
          `TIMESTAMP: ${new Date().toLocaleString()}\n` +
          `CONNECTION STATUS: ${status}\n` +
          `HARDWARE MODE: ${isSimulated ? 'VIRTUAL MESH SIMULATION' : 'USB SERIAL DEVICE'}\n` +
          `-----------------------------------------\n\n` +
          logs.map(log => `[${log.timestamp}] ${log.msg}`).join('\n') +
          `\n\n[EOF: SECURE SESSION LOGS]`;

        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `DARK_LINK_SESSION_${new Date().getTime()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Derived Mesh Analytics
    const activeNodes = nodes.filter(n => status === 'ACTIVE');
    const avgLatency = activeNodes.length > 0 
        ? Math.round(activeNodes.reduce((acc, curr) => acc + curr.latency, 0) / activeNodes.length) 
        : 0;
    const bestRssi = activeNodes.length > 0 
        ? Math.max(...activeNodes.map(n => n.rssi)) 
        : -120;

    const activeSelectedNode = selectedNode ? nodes.find(n => n.id === selectedNode.id) || selectedNode : null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center">
                        <span className="mr-3 p-2 bg-red-500/10 rounded-lg border border-red-500/20">📡</span> Dark <span className="text-red-500 ml-2">Link</span>
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 ml-1">Off-Grid Mesh Networking // Meshtastic Integration</p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'ACTIVE' ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`}></div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'ACTIVE' ? 'text-red-500' : 'text-slate-500'}`}>
                        {status === 'ACTIVE' ? 'OFF-GRID / MESH ACTIVE' : 'STANDARD_LINK'}
                    </span>
                </div>
            </header>

            {/* MESH METRICS SUMMARY BANNER */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-2xl border-slate-800 bg-slate-950/40">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Active Mesh Nodes</span>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-xl font-black text-white mono">{status === 'ACTIVE' ? nodes.length : 0}</span>
                        <span className="text-[9px] text-slate-400 font-bold">PEERS</span>
                    </div>
                </div>

                <div className="glass p-4 rounded-2xl border-slate-800 bg-slate-950/40">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Avg Hop Latency</span>
                    <div className="flex items-baseline space-x-2">
                        <span className={`text-xl font-black mono ${status === 'ACTIVE' ? (avgLatency < 40 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-600'}`}>
                            {status === 'ACTIVE' ? `${avgLatency} ms` : 'N/A'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold">RTT</span>
                    </div>
                </div>

                <div className="glass p-4 rounded-2xl border-slate-800 bg-slate-950/40">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Peak Signal Strength</span>
                    <div className="flex items-baseline space-x-2">
                        <span className={`text-xl font-black mono ${status === 'ACTIVE' ? 'text-cyan-400' : 'text-slate-600'}`}>
                            {status === 'ACTIVE' ? `${bestRssi} dBm` : 'N/A'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold">RSSI</span>
                    </div>
                </div>

                <div className="glass p-4 rounded-2xl border-slate-800 bg-slate-950/40">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Mesh Encryption</span>
                    <div className="flex items-center space-x-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-black text-emerald-400 mono">AES-256-GCM</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/40">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Hardware Interface</h3>
                        
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocol</span>
                                    <span className="text-[10px] font-bold text-white mono">LoRa / Meshtastic</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Baud Rate</span>
                                    <span className="text-[10px] font-bold text-cyan-400 mono">115200</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Encryption</span>
                                    <span className="text-[10px] font-bold text-green-400 mono">AES-256-GCM</span>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-900/20 border border-red-500/40 rounded-xl space-y-3">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">{error}</p>
                                    <button 
                                        onClick={() => activateDarkLink(true)}
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-[9px] font-black text-white uppercase tracking-widest rounded-lg border border-slate-700"
                                    >
                                        Bypass with Simulated Mode
                                    </button>
                                </div>
                            )}

                            {status !== 'ACTIVE' ? (
                                <div className="space-y-4">
                                    <button 
                                        onClick={() => activateDarkLink(false)} 
                                        disabled={status === 'CONNECTING'}
                                        className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-[10px] font-black py-4 rounded-2xl uppercase tracking-[0.2em] shadow-lg shadow-red-600/20 transition-all active:scale-95"
                                    >
                                        {status === 'CONNECTING' ? 'INITIALIZING_HARDWARE...' : 'ACTIVATE DARK-LINK'}
                                    </button>
                                    {!error && (
                                        <button 
                                            onClick={() => activateDarkLink(true)}
                                            className="w-full text-slate-500 hover:text-slate-300 text-[8px] font-black uppercase tracking-widest py-1 transition-colors"
                                        >
                                            Enter Simulated Bypass Mode
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button 
                                    onClick={disconnect} 
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black py-4 rounded-2xl uppercase tracking-[0.2em] border border-slate-700 transition-all active:scale-95"
                                >
                                    DEACTIVATE LINK
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/40">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">System Status</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[9px] font-bold mono text-slate-500">
                                <span>Signal Strength</span>
                                <span className={status === 'ACTIVE' ? 'text-green-400' : 'text-slate-700'}>{status === 'ACTIVE' ? '-84 dBm' : 'N/A'}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ${status === 'ACTIVE' ? 'bg-green-500 w-[70%]' : 'w-0'}`}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    {/* TAB CONTROL BAR */}
                    <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setActiveTab('topology')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    activeTab === 'topology'
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                        : 'text-slate-400 hover:text-white bg-slate-900/50'
                                }`}
                            >
                                📡 Mesh Topology & Nodes
                            </button>
                            <button
                                onClick={() => setActiveTab('hardening')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer ${
                                    activeTab === 'hardening'
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                        : 'text-slate-400 hover:text-white bg-slate-900/50'
                                }`}
                            >
                                <span>🛡️ Mesh Hardening & Security</span>
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[8px] px-1.5 py-0.5 rounded-full font-mono">
                                    MESHTASTIC
                                </span>
                            </button>
                        </div>

                        <button
                            onClick={handleApplyFullHardeningProfile}
                            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
                        >
                            <span>⚡ APPLY ALL HARDENING</span>
                        </button>
                    </div>

                    {activeTab === 'topology' && (
                        /* VISUAL MESH NODE TOPOLOGY DASHBOARD */
                        <div className="glass rounded-3xl border-slate-800 bg-slate-950/60 p-6 space-y-6 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                                <div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                                        Off-Grid Mesh Nodes & Latency Topology
                                    </h3>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                        Real-time P2P RF Signal Quality & Hop Distance Mapping
                                    </p>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                                    FREQ: 915.0 MHz
                                </span>
                            </div>

                            {/* TOPOLOGY VISUALIZER MAP */}
                            <div className="relative bg-slate-950 rounded-2xl border border-slate-800/80 p-6 overflow-hidden min-h-[220px] flex items-center justify-center">
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                
                                {status === 'ACTIVE' ? (
                                    <div className="w-full relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 py-2">
                                        {/* Local Master Node */}
                                        <div className="flex flex-col items-center text-center group">
                                            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-400 font-black text-xs shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse">
                                                LOCAL
                                            </div>
                                            <span className="text-[10px] font-black text-white uppercase tracking-wider mt-2">LOCAL MASTER</span>
                                            <span className="text-[8px] font-mono text-slate-500">0x0000 // ORIGIN</span>
                                        </div>

                                        {/* Connectivity Hop Connectors */}
                                        <div className="flex-1 w-full flex flex-col space-y-3 px-2">
                                            {nodes.slice(0, 3).map((node) => {
                                                const isGoodSignal = node.rssi > -90;
                                                const isModerate = node.rssi <= -90 && node.rssi > -102;
                                                return (
                                                    <div key={node.id} className="flex items-center space-x-2 text-[9px] font-mono">
                                                        <span className="w-16 truncate font-bold text-slate-400">{node.callsign}</span>
                                                        <div className="flex-1 h-1.5 bg-slate-900 rounded-full relative overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-500 ${isGoodSignal ? 'bg-emerald-500' : isModerate ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                style={{ width: `${Math.max(10, Math.min(100, 100 + node.rssi))}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className={`w-12 text-right font-bold ${node.latency < 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            {node.latency}ms
                                                        </span>
                                                        <span className="text-slate-600 text-[8px]">{node.hops}h</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Peer Cluster count */}
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xs">
                                                +{nodes.length}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider mt-2">MESH CLUSTER</span>
                                            <span className="text-[8px] font-mono text-emerald-400">ACTIVE P2P LINK</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2 z-10">
                                        <span className="text-2xl opacity-40">📡</span>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                            DarkLink Mesh Interface Offline
                                        </p>
                                        <p className="text-[9px] text-slate-600">Activate link to start mesh node discovery & hop latency monitoring</p>
                                    </div>
                                )}
                            </div>

                            {/* MESH NODES LIST / DETAILED TELEMETRY TABLE */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                                    <span>Discovered Off-Grid Nodes</span>
                                    <span>Signal & Hop Status</span>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5">
                                    {nodes.map((node) => {
                                        const isSelected = selectedNode?.id === node.id;
                                        const signalPercent = Math.max(10, Math.min(100, 100 + node.rssi));
                                        const isPinging = pingingNodeId === node.id;

                                        return (
                                            <div 
                                                key={node.id}
                                                onClick={() => setSelectedNode(isSelected ? null : node)}
                                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                                    isSelected 
                                                        ? 'bg-slate-900 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                                                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${
                                                            node.role === 'Gateway' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                                            node.role === 'Relay' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        }`}>
                                                            {node.callsign.substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-xs font-black text-white mono">{node.callsign}</span>
                                                                <span className="text-[8px] font-mono text-slate-500">[{node.id}]</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2 mt-0.5">
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{node.role}</span>
                                                                <span className="text-slate-700">•</span>
                                                                <span className="text-[8px] font-mono text-slate-500">{node.frequency}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-4 justify-between sm:justify-end">
                                                        {/* Signal Strength gauge */}
                                                        <div className="flex flex-col items-end">
                                                            <div className="flex items-center space-x-1.5">
                                                                <span className={`text-[10px] font-black mono ${node.rssi > -85 ? 'text-emerald-400' : node.rssi > -100 ? 'text-amber-400' : 'text-red-400'}`}>
                                                                    {node.rssi} dBm
                                                                </span>
                                                                <span className="text-[8px] text-slate-500 font-mono">({node.snr} SNR)</span>
                                                            </div>
                                                            <div className="w-20 h-1 bg-slate-950 rounded-full overflow-hidden mt-1">
                                                                <div 
                                                                    className={`h-full ${node.rssi > -85 ? 'bg-emerald-500' : node.rssi > -100 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${signalPercent}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>

                                                        {/* Hop latency badge */}
                                                        <div className="flex flex-col items-end min-w-[70px]">
                                                            <span className="text-[9px] font-black text-slate-300 mono">{node.latency} ms</span>
                                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                                                {node.hops === 1 ? '1 HOP (DIRECT)' : `${node.hops} HOPS`}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center space-x-1.5">
                                                            {/* Inspect Details Button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedNode(node);
                                                                }}
                                                                className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-[8px] font-black text-red-400 uppercase tracking-wider rounded-lg border border-red-500/30 transition-all active:scale-95"
                                                            >
                                                                INSPECT
                                                            </button>

                                                            {/* Ping Button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePingNode(node);
                                                                }}
                                                                disabled={isPinging || status !== 'ACTIVE'}
                                                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-[8px] font-black text-slate-200 uppercase tracking-wider rounded-lg border border-slate-700 transition-all active:scale-95"
                                                            >
                                                                {isPinging ? 'PINGING...' : 'PING'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'hardening' && (
                        /* MESHTASTIC MESH HARDENING PANEL */
                        <div className="glass rounded-3xl border-slate-800 bg-slate-950/60 p-6 space-y-6 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                                <div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <span className="p-1 bg-red-500/20 text-red-400 rounded">🛡️</span>
                                        Meshtastic Off-Grid Mesh Hardening Suite
                                    </h3>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                        RF Footprint Minimization • AES-256-GCM PSK Rotation • Anti-SIGINT Protection
                                    </p>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                                    STATUS: {channelName !== "LongFast" && pskRotated ? "HARDENED" : "STANDARD / EXPOSED"}
                                </span>
                            </div>

                            {/* Outpost Delta Vulnerability Advisory */}
                            <div className="border border-amber-500/40 bg-amber-950/30 p-4 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-amber-400">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">OUTPOST-DELTA MESH VULNERABILITY ADVISORY</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-amber-300/80 bg-amber-900/40 border border-amber-500/30 px-2 py-0.5 rounded">
                                        SNR: -2.1 dB // 3 Hops
                                    </span>
                                </div>
                                <p className="text-[11px] text-amber-200/90 leading-relaxed font-mono">
                                    The weak SNR (-2.1 dB) on your 3rd hop makes Outpost-Delta a prime target for signal disruption or interception. Hardening software settings won't fix a failing physical RF link—move Relay-Bravo closer to the center of the mesh or switch GW-ALPHA to a directional Yagi beam antenna to boost the noise floor margin.
                                </p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <button
                                        onClick={handleToggleYagiAntenna}
                                        className={`px-3 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                                            yagiAntennaEnabled 
                                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-lg' 
                                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                                        }`}
                                    >
                                        {yagiAntennaEnabled ? "✓ YAGI DIRECTIONAL BEAM ENGAGED (+12dBi Gain)" : "🎯 ENGAGE GW-ALPHA YAGI DIRECTIONAL BEAM"}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 1. Channel Name Security */}
                                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">1. Channel Name Security</span>
                                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded ${
                                            channelName !== "LongFast" ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-red-950 text-red-400 border border-red-500/30'
                                        }`}>
                                            {channelName !== "LongFast" ? 'CUSTOM / SECURE' : 'DEFAULT "LongFast"'}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 leading-normal">
                                        Change default channel name from "LongFast" to avoid discovery by standard LoRa scanner tools.
                                    </p>
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={channelName}
                                            onChange={(e) => setChannelName(e.target.value)}
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-red-500"
                                            placeholder="e.g. TAC-NET-SECURE-915"
                                        />
                                        <button
                                            onClick={() => handleSaveChannelName(channelName)}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase rounded-xl border border-slate-700 transition-all cursor-pointer"
                                        >
                                            UPDATE
                                        </button>
                                    </div>
                                </div>

                                {/* 2. PSK Encryption Key Rotation */}
                                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">2. 256-Bit PSK Key Rotation</span>
                                        <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded">
                                            AES-256-GCM
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 leading-normal">
                                        Generate a new 256-bit Preshared Key under Channel Settings; sync all nodes simultaneously via QR code/NFC.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-mono text-slate-300 truncate">
                                            {pskKey}
                                        </div>
                                        <button
                                            onClick={handleRotatePsk}
                                            className="w-full py-2 bg-red-600/80 hover:bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer active:scale-95 shadow-md"
                                        >
                                            🔑 ROTATE 256-BIT PSK ENCRYPTION KEY
                                        </button>
                                    </div>
                                </div>

                                {/* 3. GPS & Position Obfuscation (Geoloc Mud) */}
                                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">3. GPS Position Obfuscation</span>
                                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded ${
                                            !fixedPosition && positionOffset ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                        }`}>
                                            {!fixedPosition && positionOffset ? 'OBFUSCATED (GEOLOC MUD)' : 'EXPOSED GPS'}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 leading-normal">
                                        Toggle Fixed Position to OFF and use Position Offset (Geoloc Mud) to shift reported coordinates by a few hundred meters.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={handleToggleFixedPosition}
                                            className={`py-2 px-3 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                                                !fixedPosition 
                                                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40' 
                                                    : 'bg-slate-950 text-slate-400 border-slate-800'
                                            }`}
                                        >
                                            FIXED POS: {!fixedPosition ? 'OFF (SECURE)' : 'ON (EXPOSED)'}
                                        </button>
                                        <button
                                            onClick={handleTogglePositionOffset}
                                            className={`py-2 px-3 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                                                positionOffset 
                                                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40' 
                                                    : 'bg-slate-950 text-slate-400 border-slate-800'
                                            }`}
                                        >
                                            GEOLOC MUD: {positionOffset ? 'ACTIVE (+350m)' : 'DISABLED'}
                                        </button>
                                    </div>
                                </div>

                                {/* 4. Device Local Admin Lock */}
                                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">4. Device Admin Lock</span>
                                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded ${
                                            adminLockEnabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                        }`}>
                                            {adminLockEnabled ? 'LOCKED' : 'UNPROTECTED'}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 leading-normal">
                                        Set a Local Admin Password to prevent unauthorized reconfiguration over Bluetooth/USB if node hardware is captured.
                                    </p>
                                    <div className="flex space-x-2">
                                        <input
                                            type="password"
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-red-500"
                                            placeholder="Set Admin Password"
                                        />
                                        <button
                                            onClick={handleToggleAdminLock}
                                            className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-xl border transition-all cursor-pointer ${
                                                adminLockEnabled ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                                            }`}
                                        >
                                            {adminLockEnabled ? 'LOCKED' : 'LOCK'}
                                        </button>
                                    </div>
                                </div>

                                {/* 5. Broadcast Frequency Reduction (30+ Mins) */}
                                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">5. Broadcast Frequency (SIGINT)</span>
                                        <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded">
                                            {broadcastInterval} MIN INTERVAL
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 leading-normal">
                                        Increase Position & Telemetry Broadcast Interval to at least 30 minutes to minimize RF footprint & SIGINT dwell time.
                                    </p>
                                    <div className="flex gap-2">
                                        {[5, 15, 30, 60].map((mins) => (
                                            <button
                                                key={mins}
                                                onClick={() => handleSetBroadcastInterval(mins)}
                                                className={`flex-1 py-1.5 text-[9px] font-black font-mono rounded-xl border transition-all cursor-pointer ${
                                                    broadcastInterval === mins
                                                        ? 'bg-red-600 text-white border-red-500'
                                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                {mins}m {mins >= 30 ? '🛡️' : ''}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 6. Hop-Limit Restrict to 3 */}
                                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">6. Restricted Hop Limit</span>
                                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded ${
                                            hopLimit <= 3 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800'
                                        }`}>
                                            LIMIT: {hopLimit} HOPS
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 leading-normal">
                                        Restrict Hop Limit to 3 in Network Settings to prevent packets from propagating indefinitely and creating noise across 915 MHz band.
                                    </p>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 5, 7].map((h) => (
                                            <button
                                                key={h}
                                                onClick={() => handleSetHopLimit(h)}
                                                className={`flex-1 py-1.5 text-[9px] font-black font-mono rounded-xl border transition-all cursor-pointer ${
                                                    hopLimit === h
                                                        ? 'bg-red-600 text-white border-red-500'
                                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                {h} Hop{h > 1 ? 's' : ''} {h === 3 ? '🛡️' : ''}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 7. Silence Mode / Stealth Mode */}
                                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3 md:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-black text-white uppercase tracking-wider block">7. Silence / Quiet Mode (Total Stealth)</span>
                                            <p className="text-[9px] text-slate-400 leading-normal mt-0.5">
                                                Enable Quiet Mode to suppress all non-essential automated ACKs and node-info broadcast packets for maximum operational stealth.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleToggleSilenceMode}
                                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer shrink-0 ${
                                                silenceMode 
                                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-lg' 
                                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                            }`}
                                        >
                                            {silenceMode ? '🤫 QUIET MODE ENGAGED' : 'ENABLE QUIET MODE'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TERMINAL LOGS OUTPUT */}
                    <div className="glass rounded-3xl border-slate-800 bg-slate-950/60 h-[320px] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mesh_Terminal // Secure_Node_Output</span>
                            <div className="flex items-center space-x-3">
                                {logs.length > 0 && (
                                    <button 
                                        onClick={handleDownloadLogs}
                                        className="bg-slate-800 hover:bg-slate-750 text-red-500 border border-slate-700 hover:border-red-500/50 rounded px-2 py-0.5 text-[8.5px] font-black uppercase tracking-widest transition-all"
                                    >
                                        EXPORT_LOGS
                                    </button>
                                )}
                                <div className="flex space-x-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-red-500 animate-pulse' : 'bg-slate-800'}`}></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-6 space-y-3 bg-slate-950/40 scrollbar-hide">
                            {logs.length > 0 ? (
                                logs.map((log, i) => (
                                    <div key={i} className="text-[11px] mono flex space-x-4 animate-in fade-in slide-in-from-left-2">
                                        <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                                        <span className={`${log.msg.includes('ERROR') ? 'text-red-400' : log.msg.includes('SUCCESS') || log.msg.includes('ACTIVE') || log.msg.includes('ICMP_ECHO_REPLY') ? 'text-green-400' : 'text-slate-300'}`}>
                                            {log.msg}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Awaiting Hardware Handshake</span>
                                </div>
                            )}
                        </div>

                        {status === 'ACTIVE' && (
                            <div className="p-4 bg-slate-900/60 border-t border-slate-800">
                                <form 
                                    onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                                    className="flex space-x-2"
                                >
                                    <input 
                                        type="text" 
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="SEND MESH MESSAGE..." 
                                        className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] text-white mono outline-none focus:border-red-500"
                                    />
                                    <button 
                                        type="submit"
                                        className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                        SEND
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MESH NODE TECHNICAL DETAILS SIDE DRAWER */}
            {activeSelectedNode && (
                <>
                    {/* Backdrop overlay */}
                    <div 
                        onClick={() => setSelectedNode(null)}
                        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[140] animate-in fade-in duration-200"
                    />

                    {/* Side Drawer Panel */}
                    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-slate-950/95 border-l border-slate-800/80 backdrop-blur-2xl z-[150] p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-y-auto space-y-6 flex flex-col justify-between animate-in slide-in-from-right duration-300">
                        <div className="space-y-6">
                            {/* Drawer Header */}
                            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black border ${
                                        activeSelectedNode.role === 'Gateway' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                                        activeSelectedNode.role === 'Relay' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    }`}>
                                        {activeSelectedNode.callsign.substring(0, 2)}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h2 className="text-base font-black text-white tracking-wide mono">{activeSelectedNode.callsign}</h2>
                                            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                                                {activeSelectedNode.id}
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            {activeSelectedNode.role} Node • Off-Grid P2P Mesh
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedNode(null)}
                                    className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition-all cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Status & Quick Metrics Banner */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Operational State</span>
                                    <div className="flex items-center space-x-2">
                                        <span className={`w-2 h-2 rounded-full ${
                                            activeSelectedNode.status === 'DEGRADED' ? 'bg-amber-500 animate-pulse' :
                                            activeSelectedNode.status === 'DIRECT' ? 'bg-cyan-400' : 'bg-emerald-500'
                                        }`} />
                                        <span className={`text-xs font-black mono ${
                                            activeSelectedNode.status === 'DEGRADED' ? 'text-amber-400' :
                                            activeSelectedNode.status === 'DIRECT' ? 'text-cyan-400' : 'text-emerald-400'
                                        }`}>
                                            {activeSelectedNode.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Last Telemetry</span>
                                    <span className="text-xs font-black text-slate-300 mono">{activeSelectedNode.lastSeen}</span>
                                </div>
                            </div>

                            {/* Technical Specifications Section */}
                            <div className="space-y-3">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Technical Specifications</span>
                                
                                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
                                    {/* MAC Address */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">MAC Address</span>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-mono text-white text-[11px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                                {activeSelectedNode.macAddress}
                                            </span>
                                            <button
                                                onClick={() => handleCopyMac(activeSelectedNode.macAddress)}
                                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[8px] font-black text-slate-300 uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                                            >
                                                {copiedMac ? 'COPIED!' : 'COPY'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Firmware Version */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">Firmware Version</span>
                                        <span className="font-mono text-emerald-400 text-[11px] bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                            {activeSelectedNode.firmwareVersion}
                                        </span>
                                    </div>

                                    {/* Chipset / Modulator */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">Hardware Chipset</span>
                                        <span className="font-mono text-slate-300 text-[11px]">{activeSelectedNode.chipset}</span>
                                    </div>

                                    {/* TX Power */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">TX Transmission Power</span>
                                        <span className="font-mono text-cyan-400 text-[11px]">{activeSelectedNode.txPower}</span>
                                    </div>

                                    {/* Battery Status */}
                                    <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Battery Capacity</span>
                                            <span className={`font-mono text-xs font-black ${
                                                activeSelectedNode.battery < 30 ? 'text-red-400' :
                                                activeSelectedNode.battery < 60 ? 'text-amber-400' : 'text-emerald-400'
                                            }`}>
                                                {activeSelectedNode.battery}%
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
                                            <div 
                                                className={`h-full transition-all duration-500 ${
                                                    activeSelectedNode.battery < 30 ? 'bg-red-500' :
                                                    activeSelectedNode.battery < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${activeSelectedNode.battery}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RF Signal Telemetry & Hop Latency */}
                            <div className="space-y-3">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">RF Signal Quality & Hop Latency</span>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-2xl space-y-1">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">RSSI Signal</span>
                                        <div className="flex items-baseline space-x-1">
                                            <span className={`text-sm font-black mono ${
                                                activeSelectedNode.rssi > -90 ? 'text-emerald-400' :
                                                activeSelectedNode.rssi > -105 ? 'text-amber-400' : 'text-red-400'
                                            }`}>
                                                {activeSelectedNode.rssi}
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-bold">dBm</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-2xl space-y-1">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">SNR (Noise Ratio)</span>
                                        <div className="flex items-baseline space-x-1">
                                            <span className={`text-sm font-black mono ${activeSelectedNode.snr < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {activeSelectedNode.snr > 0 ? `+${activeSelectedNode.snr}` : activeSelectedNode.snr}
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-bold">dB</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-2xl space-y-1">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Hop RTT Latency</span>
                                        <div className="flex items-baseline space-x-1">
                                            <span className={`text-sm font-black mono ${
                                                activeSelectedNode.latency < 50 ? 'text-emerald-400' :
                                                activeSelectedNode.latency < 100 ? 'text-amber-400' : 'text-red-400'
                                            }`}>
                                                {activeSelectedNode.latency}
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-bold">ms</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-2xl space-y-1">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Packet Loss Est.</span>
                                        <div className="flex items-baseline space-x-1">
                                            <span className={`text-sm font-black mono ${activeSelectedNode.packetLoss > 10 ? 'text-red-400' : 'text-slate-300'}`}>
                                                {activeSelectedNode.packetLoss}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* OTA FIRMWARE FLASHING INTERFACE */}
                            <div className="space-y-3 pt-2 border-t border-slate-800/80">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <span>⚡</span> OVER-THE-AIR (OTA) FIRMWARE FLASH
                                    </span>
                                    <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                                        SECURE P2P LORA
                                    </span>
                                </div>

                                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3.5">
                                    {/* Firmware Binary Target Selection */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Select Target Firmware Image
                                        </label>
                                        <select
                                            value={selectedFirmware}
                                            onChange={(e) => setSelectedFirmware(e.target.value)}
                                            disabled={flashingNodeId === activeSelectedNode.id}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-red-500 cursor-pointer disabled:opacity-50"
                                        >
                                            <option value="v2.5.4-SECURE-HARDENED">
                                                v2.5.4-SECURE-HARDENED (AES-256-GCM + Anti-SIGINT)
                                            </option>
                                            <option value="v2.5.2-TAC-STEALTH">
                                                v2.5.2-TAC-STEALTH (Quiet Mode + Suppressed ACKs)
                                            </option>
                                            <option value="v2.4.12-mesh-release">
                                                v2.4.12-mesh-release (Standard Stable Mesh)
                                            </option>
                                        </select>
                                    </div>

                                    {/* Pre-flash Checklist */}
                                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                                        <div className="flex items-center space-x-1.5">
                                            <span className={activeSelectedNode.battery >= 30 ? "text-emerald-400" : "text-red-400"}>
                                                {activeSelectedNode.battery >= 30 ? "✓" : "✗"}
                                            </span>
                                            <span className="text-slate-400">Battery: {activeSelectedNode.battery}%</span>
                                        </div>
                                        <div className="flex items-center space-x-1.5">
                                            <span className="text-emerald-400">✓</span>
                                            <span className="text-slate-400">P2P Mesh Link: OK</span>
                                        </div>
                                        <div className="flex items-center space-x-1.5">
                                            <span className="text-emerald-400">✓</span>
                                            <span className="text-slate-400">SHA-256 Sign: OK</span>
                                        </div>
                                        <div className="flex items-center space-x-1.5">
                                            <span className="text-emerald-400">✓</span>
                                            <span className="text-slate-400">AES-256-GCM Session</span>
                                        </div>
                                    </div>

                                    {/* Flash Progress or Action Button */}
                                    {flashingNodeId === activeSelectedNode.id ? (
                                        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-red-500/40">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-mono text-red-400 font-black text-[10px] animate-pulse">
                                                    FLASHING FIRMWARE IN PROGRESS...
                                                </span>
                                                <span className="font-mono text-white font-bold text-[11px]">
                                                    {flashProgress}%
                                                </span>
                                            </div>
                                            
                                            {/* Progress Bar */}
                                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                                <div
                                                    className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 transition-all duration-300"
                                                    style={{ width: `${flashProgress}%` }}
                                                />
                                            </div>

                                            <p className="text-[9px] font-mono text-slate-300 animate-pulse">
                                                {flashStep}
                                            </p>
                                        </div>
                                    ) : activeSelectedNode.firmwareVersion === selectedFirmware ? (
                                        <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl space-y-1 text-center">
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                                                ✓ FIRMWARE UP-TO-DATE ({selectedFirmware})
                                            </span>
                                            <p className="text-[9px] text-emerald-300/80 font-mono">
                                                Node active with verified signature. Ready for off-grid operation.
                                            </p>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleStartOtaFlash(activeSelectedNode.id, activeSelectedNode.callsign)}
                                            disabled={status !== 'ACTIVE' || activeSelectedNode.battery < 30}
                                            className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg shadow-red-600/20"
                                        >
                                            ⚡ INITIATE OVER-THE-AIR (OTA) FLASH
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Range Advisory Banner */}
                            {(activeSelectedNode.diagnosticNote || activeSelectedNode.rssi < -105 || activeSelectedNode.snr < 0) && (
                                <div className="border border-amber-500/40 bg-amber-950/30 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center space-x-2 text-amber-400">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">CRITICAL LINK ADVISORY</span>
                                    </div>
                                    <p className="text-[11px] text-amber-200/90 leading-relaxed font-mono">
                                        {activeSelectedNode.diagnosticNote || "Signal is nearing noise floor limit with elevated hop latency and potential packet degradation."}
                                    </p>
                                    <button
                                        onClick={() => handleStabilizeLink(activeSelectedNode.id)}
                                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg"
                                    >
                                        STABILIZE MESH ROUTE & REPOSITION RELAY
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Action Footer */}
                        <div className="pt-4 border-t border-slate-800 flex items-center space-x-3">
                            <button
                                onClick={() => handlePingNode(activeSelectedNode)}
                                disabled={pingingNodeId === activeSelectedNode.id || status !== 'ACTIVE'}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer"
                            >
                                {pingingNodeId === activeSelectedNode.id ? 'PINGING NODE...' : 'PING NODE (ICMP)'}
                            </button>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-xl border border-slate-800 transition-all cursor-pointer"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

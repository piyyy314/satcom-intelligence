
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { playSystemVoice } from '../services/audioService.ts';
import { QuantumDefense } from './QuantumDefense.tsx';
import { WarGamesSimulator } from './WarGamesSimulator.tsx';
import { StealthSniffer } from './StealthSniffer.tsx';
import { SiemAudit } from './SiemAudit.tsx';
import { PqcKeyManager } from './PqcKeyManager.tsx';
import { PqcAuditHistory } from './PqcAuditHistory.tsx';
import { SecurityTab } from '../types.ts';

interface Props {
  userLoc: { lat: number, lng: number };
  selectedSatName: string;
  isJamming: boolean;
  setIsJamming: (val: boolean) => void;
  jammingPower: number;
  setJammingPower: (val: number) => void;
  signalQuality: number;
  onBack?: () => void;
  isStealthMode: boolean;
  setIsStealthMode: (val: boolean) => void;
  addMissionLog: (detail: string, status: any) => void;
}

interface InterceptedIntel {
  id: string;
  time: string;
  src: string;
  dst: string;
  data: string;
}

interface IPLogEntry {
  time: string;
  msg: string;
  type: 'INFO' | 'WARN' | 'SUCCESS' | 'FAIL' | 'ALERT';
}

const TACTICAL_SCRIPTS = [
  {
    id: 'aether_decoy',
    category: 'Advanced',
    name: 'Aetheric Decoy Gen.',
    lang: 'python',
    code: `import random

def deploy_aether_decoy(target_freq, num_ghosts=5):
    """Generates ghost signals in sub-space to mask true carrier."""
    decoys = []
    for _ in range(num_ghosts):
        offset = random.uniform(-50.0, 50.0) # MHz
        ghost_freq = target_freq + (offset / 1000.0)
        decoys.append({
            "freq": ghost_freq,
            "power": random.randint(-45, -30),
            "phase": random.randint(0, 359)
        })
    return decoys

# GHOST_UPLINK: ACTIVE
print(f"[!] DEPLOYING {len(deploy_aether_decoy(14.25))} SUB-SPACE DECOYS")`
  },
  {
    id: 'aether_mod',
    category: 'Advanced',
    name: 'Aetheric Flux Shielding',
    lang: 'python',
    code: `import numpy as np

def modulate_aether_shield(carrier_freq, resonance_point=1.618):
    """Encapsulates RF frames in high-frequency aetheric harmonics."""
    t = np.linspace(0, 1, 1024)
    aether_flux = np.sin(2 * np.pi * resonance_point * t)
    carrier = np.sin(2 * np.pi * carrier_freq * t)
    
    # Non-linear coupling for sub-space propagation
    shielded_signal = carrier * (1 + 0.1 * aether_flux)
    return shielded_signal

print("[!] AETHERIC_SHIELD: STABILIZED")`
  },
  {
    id: 'zero_point',
    category: 'Advanced',
    name: 'Zero-Point Extraction',
    lang: 'shell',
    code: `# Initiates quantum vacuum energy harvest for BUC cooling
# WARNING: Potential decoherence risk in Ka-band
echo "STIA_ZPE_INIT: Requesting Vacuum Grid Access..."
modprobe q-vacuum-driver
echo 1 > /proc/sys/quantum/zpe_drain
echo "[OK] THERMAL_DELTA: -42C (Vacuum Grounding Active)"`
  },
  {
    id: 'tachyon_sync',
    category: 'Advanced',
    name: 'Tachyon Drift Corr.',
    lang: 'cpp',
    code: `// Relativistic clock synchronization for high-velocity orbits
double calculate_tachyon_drift(double local_clock, double sat_clock) {
    const double C = 299792458.0;
    const double V = 3070.0; // Mean velocity
    double gamma = 1 / sqrt(1 - pow(V/C, 2));
    
    // Reverse time dilation via tachyon bursts
    return (sat_clock - local_clock) * gamma;
}`
  },
  {
    id: 'rf_entropy',
    category: 'Defensive',
    name: 'RF Entropy Monitor',
    lang: 'python',
    code: `import math
def calculate_entropy(data):
    if not data: return 0
    entropy = 0
    for x in range(256):
        p_x = float(data.count(chr(x)))/len(data)
        if p_x > 0:
            entropy += - p_x * math.log(p_x, 2)
    return entropy`
  },
  {
    id: 'header_spoof',
    category: 'Offensive',
    name: 'DVB-S2 Header Injector',
    lang: 'python',
    code: `import binascii
def craft_dvb_s2_frame(data_payload):
    MATYPE = "f0"
    UPL = "0000"
    DFL = binascii.hexlify(len(data_payload).to_bytes(2, 'big')).decode()
    return f"{MATYPE}{UPL}{DFL}" + binascii.hexlify(data_payload).decode()`
  },
  {
    id: 'stealth_sniffer',
    category: 'Offensive',
    name: 'Stealth Packet Sniffer',
    lang: 'python',
    code: `from scapy.all import sniff, IP, TCP, Raw

def packet_callback(packet):
    if packet.haslayer(TCP) and packet.haslayer(Raw):
        payload = packet[Raw].load.decode('utf-8', errors='ignore')
        # Look for keywords in the raw data
        keywords = ['user', 'pass', 'login', 'post']
        if any(word in payload.lower() for word in keywords):
            print(f"\\n[!] Interesting Traffic Found on {packet[IP].dst}:")
            print(f"Details: {payload[:200]}")

print("--- Starting Stealth Sniffer (Ctrl+C to stop) ---")
# Filter for port 80 (HTTP) to keep it focused
sniff(filter="tcp port 80", prn=packet_callback, store=0)`
  },
  {
    id: 'aegis_cnc',
    category: 'Advanced',
    name: 'AEGIS Command & Control',
    lang: 'python',
    code: `import os
import sys

def display_menu():
    os.system('cls' if os.name == 'nt' else 'clear')
    print("""
    =========================================
    🔗 AEGIS COMMAND & CONTROL - V1.0
    =========================================
    [1] RECON: Threaded Port Mapper
    [2] INTEL: Service Banner Grabber
    [3] SNIFF: Stealth Packet Analyzer
    [4] CRYPTO: Secure File Encryptor
    [5] DEFEND: ARP Spoof Detector
    [6] DECEIVE: Active Honeypot
    [0] EXIT
    =========================================
    """)

def main():
    while True:
        display_menu()
        choice = input("Select an operation: ")

        if choice == '1':
            print("\\n[*] Initializing Parallel Mapper...")
        elif choice == '2':
            target = input("Enter target IP: ")
        elif choice == '3':
            print("\\n[*] Sniffer engaging. Press Ctrl+C to stop.")
        elif choice == '0':
            print("Shutting down...")
            break
        else:
            print("Invalid selection.")
        
        input("\\nPress Enter to return to menu...")

if __name__ == "__main__":
    main()`
  },
  {
    id: 'grover_search',
    category: 'Quantum',
    name: "Grover's Search Algorithm",
    lang: 'python',
    code: `from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# We want to find the state '11' in a 2-qubit system
qc = QuantumCircuit(2, 2)

# 1. Initialize superposition
qc.h([0, 1])

# 2. The Oracle (Marking the '11' state)
qc.cz(0, 1) 

# 3. The Diffuser (Amplifying the probability of the marked state)
qc.h([0, 1])
qc.z([0, 1])
qc.cz(0, 1)
qc.h([0, 1])

# 4. Measure
qc.measure([0, 1], [0, 1])

sim = AerSimulator()
counts = sim.run(qc).result().get_counts()
print(f"Grover identified the target state (11) with high probability: {counts}")`
  },
  {
    id: 'port_mapper',
    category: 'Advanced',
    name: 'Threaded Port Mapper',
    lang: 'python',
    code: `from concurrent.futures import ThreadPoolExecutor
import socket

def scan_port(port):
    target = "127.0.0.1"
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        if s.connect_ex((target, port)) == 0:
            return port
    return None

print("Scanning ports 1-1024...")
with ThreadPoolExecutor(max_workers=50) as executor:
    results = list(executor.map(scan_port, range(1, 1025)))

open_ports = [p for p in results if p]
print(f"Found {len(open_ports)} open ports: {open_ports}")`
  },
  {
    id: 'siem_audit',
    category: 'Intelligence',
    name: 'SIEM/EDR Audit Wrapper',
    lang: 'python',
    code: `import siem_connector
import edr_sweeper

# AFRINIC assigned subnets
AFRINIC_RANGES = ["41.0.0.0/8", "102.0.0.0/8", "105.0.0.0/8", "154.0.0.0/8", "196.0.0.0/8", "197.0.0.0/8"]

def initiate_siem_audit():
    print("[*] INITIATING SIEM AUDIT: Querying AFRINIC subnets...")
    for subnet in AFRINIC_RANGES:
        hits = siem_connector.query_ingress(subnet)
        if hits:
            print(f"[!] INGRESS DETECTED: {len(hits)} matching patterns on {subnet}")

def execute_edr_sweep():
    print("[*] EDR: Executing localized sweep for SSH/RDP/Beaconing...")
    # Analyzing node-A3 telemetry
    return edr_sweeper.scan_nodes()

if __name__ == "__main__":
    initiate_siem_audit()
    execute_edr_sweep()
    print("[OK] AUDIT_RECON: 18:53:53")`
  }
];

export const SecurityTools: React.FC<Props> = ({ 
  userLoc, selectedSatName, isJamming, setIsJamming, jammingPower, setJammingPower, signalQuality, onBack, isStealthMode, setIsStealthMode, addMissionLog
}) => {
  const [activeTab, setActiveTab] = useState<SecurityTab>('overview');
  const [capturedIntel, setCapturedIntel] = useState<InterceptedIntel[]>([
    {
      id: 'intel-1',
      time: '13:30:17',
      src: '10.254.1.42',
      dst: '172.16.0.12',
      data: 'POST /api/auth?pass=e3cfvk&session_id=zvcqw3js'
    }
  ]);
  const [ipAttackLog, setIpAttackLog] = useState<IPLogEntry[]>([]);
  const [isIpAttacking, setIsIpAttacking] = useState(false);
  const [isAegisScanning, setIsAegisScanning] = useState(false);
  const [targetIp, setTargetIp] = useState('10.254.1.42');
  const [selectedScript, setSelectedScript] = useState(TACTICAL_SCRIPTS[0]);
  const [copyStatus, setCopyStatus] = useState(false);

  const sentinelCanvasRef = useRef<HTMLCanvasElement>(null);
  const strikeCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleArchiveIntel = (intel: { time: string, src: string, dst: string, data: string }) => {
    const newEntry: InterceptedIntel = {
      id: `intel-${Date.now()}`,
      ...intel
    };
    setCapturedIntel(prev => [newEntry, ...prev]);
    addMissionLog(`Intelligence archived to Sentinel Vault: ${intel.src}`, 'SUCCESS');
    playSystemVoice("Intelligence entry archived.");
  };

  const exportIntel = () => {
    const report = {
      timestamp: new Date().toISOString(),
      source: 'SENTINEL_INTELLIGENCE_TS_VAULT',
      session_id: Math.random().toString(36).substring(2, 12).toUpperCase(),
      entries: capturedIntel
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSI_INTEL_VAULT_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addMissionLog("Intelligence Vault decrypted and exported to local storage.", 'INFO');
    playSystemVoice("Intelligence vault broadcast initiated.");
  };

  const handleDownloadStrikeLogs = () => {
    if (ipAttackLog.length === 0) return;
    const data = `--- SENTINEL OFFENSIVE STRIKE MISSION REPORT ---\n` +
      `TIMESTAMP: ${new Date().toLocaleString()}\n` +
      `OFFENSIVE ENUMERATION TARGET: ${targetIp}\n` +
      `-----------------------------------------------\n\n` +
      `=== OFFENSIVE OUTPUT LOGS ===\n` +
      ipAttackLog.map(l => `[${l.time}] [${l.type}] ${l.msg}`).join('\n') +
      `\n\n[EOF: STRIKE OPERATIONS LOG]`;

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `STRIKE_OPERATIONS_REPORT_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      const canvas = sentinelCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let frame = 0;
      const packets: any[] = [];

      const animate = () => {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
        ctx.beginPath();
        for (let i = 0; i < canvas.width; i += 20) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
        for (let i = 0; i < canvas.height; i += 20) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
        ctx.stroke();

        if (frame % 15 === 0) {
          packets.push({
            x: 0, y: Math.random() * canvas.height,
            speed: 2 + Math.random() * 4,
            type: Math.random() > 0.9 ? 'malicious' : 'nominal',
            size: 2 + Math.random() * 5
          });
        }

        packets.forEach((p, i) => {
          p.x += p.speed;
          ctx.fillStyle = p.type === 'malicious' ? '#ef4444' : '#22d3ee';
          ctx.fillRect(p.x, p.y, p.size, p.size);
          if (p.x > canvas.width) packets.splice(i, 1);
        });

        requestAnimationFrame(animate);
      };
      const h = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(h);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'attack') {
        const canvas = strikeCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        const bursts: any[] = [];

        const animate = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (isIpAttacking && frame % 10 === 0) {
                bursts.push({
                    x: canvas.width / 2,
                    y: canvas.height / 2,
                    r: 0,
                    alpha: 1,
                    v: 4 + Math.random() * 4
                });
            }

            bursts.forEach((b, i) => {
                b.r += b.v;
                b.alpha -= 0.02;
                ctx.strokeStyle = `rgba(239, 68, 68, ${b.alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.stroke();
                if (b.alpha <= 0) bursts.splice(i, 1);
            });

            ctx.fillStyle = isIpAttacking ? '#ef4444' : '#1e293b';
            ctx.beginPath();
            ctx.arc(canvas.width/2, canvas.height/2, 10, 0, Math.PI*2);
            ctx.fill();

            requestAnimationFrame(animate);
        };
        const h = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(h);
    }
  }, [activeTab, isIpAttacking]);

  const addIpLog = (msg: string, type: IPLogEntry['type'] = 'INFO') => {
    setIpAttackLog(prev => [{ time: new Date().toLocaleTimeString([], { hour12: false }), msg, type }, ...prev].slice(0, 50));
  };

  const handleAegisOperation = (opId: string, label: string) => {
    if (isAegisScanning) return;
    
    addIpLog(`[AEGIS] Initializing Operation ${opId}: ${label}`, 'INFO');
    
    if (opId === '1') {
      setIsAegisScanning(true);
      addIpLog(`[AEGIS] Scanning ports 1-1024 on 127.0.0.1...`, 'INFO');
      
      // Simulate threaded scan
      setTimeout(() => {
        const found = [22, 80, 443, 3000, 8080];
        addIpLog(`[AEGIS] RECON COMPLETE. Found ${found.length} open ports: ${found.join(', ')}`, 'SUCCESS');
        setIsAegisScanning(false);
      }, 3000);
    } else if (opId === '2') {
      addIpLog(`[AEGIS] Grabbing service banners for ${targetIp}...`, 'INFO');
      setTimeout(() => {
        addIpLog(`[AEGIS] Port 80: nginx/1.18.0 (Ubuntu)`, 'SUCCESS');
        addIpLog(`[AEGIS] Port 22: OpenSSH 8.2p1 Ubuntu 4ubuntu0.5`, 'SUCCESS');
      }, 1500);
    } else {
      setTimeout(() => {
        addIpLog(`[AEGIS] Operation ${opId} execution successful.`, 'SUCCESS');
      }, 1000);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedScript.code);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const triggerAttack = () => {
    if (isIpAttacking) return;
    setIsIpAttacking(true);
    addIpLog(`Initiating scan on ${targetIp}...`, 'INFO');
    setTimeout(() => addIpLog(`Enumerating Sat-Gateways...`, 'INFO'), 1000);
    setTimeout(() => addIpLog(`FOUND: Open Port 8080 (Admin WebUI)`, 'ALERT'), 2500);
    setTimeout(() => {
        addIpLog(`BUFFER_OVERFLOW: Remote service crashed.`, 'SUCCESS');
        setIsIpAttacking(false);
        addMissionLog(`CRITICAL: Offensive strike against ${targetIp} completed.`, 'active');
    }, 4500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center">
             <span className="mr-3 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">🛡️</span> 
             Sentinel <span className="text-cyan-500 ml-2">Intelligence</span>
           </h2>
           <div className="flex items-center space-x-3 mt-1">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Active Defense Node // Protocol v5.1.0</p>
             <div className="flex items-center space-x-2 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Storage: Transient_Volatile</span>
             </div>
             <div className="flex items-center space-x-2 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Buffer: /dev/shm/tsi_vault</span>
             </div>
           </div>
        </div>
        {onBack && (
          <button onClick={onBack} className="bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-slate-300 px-5 py-2.5 rounded-xl border border-slate-700 transition-all uppercase tracking-widest active:scale-95">
            Mission Dashboard
          </button>
        )}
      </header>

      <div className="flex flex-wrap gap-2 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800/50">
        {[
          { id: 'overview', label: 'Monitor' },
          { id: 'pqc', label: 'PQC Key Gen' },
          { id: 'pqc_audit', label: 'PQC Audit' },
          { id: 'scripts', label: 'Cipher Library' },
          { id: 'sniffer', label: 'Sniffer' },
          { id: 'aegis', label: 'AEGIS C2' },
          { id: 'audit', label: 'SIEM Audit' },
          { id: 'attack', label: 'Strike' },
          { id: 'quantum', label: 'Physics' },
          { id: 'wargames', label: 'Simulator' }
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as SecurityTab)} 
            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
              activeTab === tab.id 
                ? 'bg-cyan-500 text-slate-950 shadow-lg' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
             <div className="lg:col-span-2 glass p-6 rounded-3xl border-slate-800 h-[500px]">
                <canvas ref={sentinelCanvasRef} width="800" height="400" className="w-full h-full bg-slate-950 rounded-2xl border border-slate-900" />
             </div>
             <div className="lg:col-span-1 space-y-6">
                <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/40">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Threat Detection Engine</h3>
                   <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                         <span className="text-[9px] font-bold text-white uppercase">Port Scan</span>
                         <span className="text-[9px] text-green-500 font-black">NEGATIVE</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                         <span className="text-[9px] font-bold text-white uppercase">Sync Collision</span>
                         <span className="text-[9px] text-green-500 font-black">NEGATIVE</span>
                      </div>
                   </div>
                   <button onClick={() => playSystemVoice("Deep packet scan in progress.")} className="w-full mt-6 py-3 bg-cyan-600/10 border border-cyan-600/30 text-cyan-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-cyan-600/20 transition-all">
                      Run Deep Scan
                   </button>
                </div>

                {capturedIntel.length > 0 && (
                   <div className="glass p-6 rounded-3xl border-red-500/30 bg-red-950/10 animate-in zoom-in-95">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center">
                          <span className="mr-2">📂</span> Intercepted Intelligence
                        </h3>
                        <button 
                          onClick={exportIntel}
                          className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest flex items-center group"
                        >
                          <span className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity">↓</span> EXPORT_VAULT
                        </button>
                      </div>
                      <div className="space-y-3">
                         {capturedIntel.map(intel => (
                           <div key={intel.id} className="p-3 bg-slate-950 rounded-xl border border-red-500/20 font-mono text-[10px]">
                              <div className="flex justify-between text-slate-500 mb-1">
                                <span>{intel.time}</span>
                                <span className="text-red-400 font-bold">{intel.src} {'->'} {intel.dst}</span>
                              </div>
                              <div className="text-cyan-100/80 break-all font-bold">{intel.data}</div>
                           </div>
                         ))}
                      </div>
                   </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'scripts' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-2">
            <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto scrollbar-hide">
              {TACTICAL_SCRIPTS.map(script => (
                <button 
                  key={script.id}
                  onClick={() => setSelectedScript(script)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedScript.id === script.id ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">{script.category}</span>
                    <span className="text-[8px] font-mono text-slate-600">{script.lang}</span>
                  </div>
                  <h4 className="text-[11px] font-bold text-white uppercase">{script.name}</h4>
                </button>
              ))}
            </div>
            <div className="lg:col-span-3 glass rounded-2xl border-slate-800 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                 <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{selectedScript.name}</h3>
                 <button onClick={handleCopyCode} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[9px] font-black text-cyan-400 uppercase tracking-widest transition-all">
                   {copyStatus ? 'COPIED' : 'COPY_CIPHER'}
                 </button>
               </div>
               <div className="flex-grow bg-slate-950 p-6 overflow-auto">
                 <pre className="text-[13px] text-cyan-100/80 font-mono leading-relaxed">{selectedScript.code}</pre>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'attack' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2">
             <div className="glass p-8 rounded-3xl border-slate-800 bg-slate-950/40 flex flex-col space-y-6">
                <div className="h-48 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 mb-4">
                    <canvas ref={strikeCanvasRef} width="400" height="200" className="w-full h-full" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Offensive Strike Terminal</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Execute targeted RF frame injections</p>
                </div>
                <div className="space-y-4">
                  <input type="text" value={targetIp} onChange={e => setTargetIp(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white mono outline-none focus:border-red-500" />
                  <button onClick={triggerAttack} disabled={isIpAttacking} className="w-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-black py-4 rounded-2xl uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95">
                    {isIpAttacking ? 'STRIKE_IN_PROGRESS...' : 'COMMENCE_RF_STRIKE'}
                  </button>
                </div>
             </div>
             <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/60 flex flex-col h-full min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Offensive Output Log</h3>
                    {ipAttackLog.length > 0 && (
                        <button 
                           onClick={handleDownloadStrikeLogs}
                           className="bg-slate-800 hover:bg-slate-750 text-red-500 border border-slate-700 hover:border-red-500/50 rounded px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all shadow-md"
                        >
                          DOWNLOAD_LOG
                        </button>
                    )}
                </div>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                  {ipAttackLog.map((log, i) => (
                    <div key={i} className="text-[11px] mono flex items-start space-x-2">
                       <span className="text-slate-600">[{log.time}]</span>
                       <span className={log.type === 'ALERT' ? 'text-red-500 font-bold' : log.type === 'SUCCESS' ? 'text-green-500' : 'text-slate-400'}>{log.msg}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'quantum' && <QuantumDefense isStealthMode={isStealthMode} addMissionLog={addMissionLog} />}
        {activeTab === 'sniffer' && <StealthSniffer />}
        {activeTab === 'aegis' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-4 space-y-6">
              <div className="glass p-8 rounded-3xl border-slate-800 bg-slate-950/40">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-b border-slate-800 pb-4 flex items-center">
                  <span className="mr-3">🔗</span> AEGIS C2 INTERFACE
                </h3>
                <div className="space-y-3">
                  {[
                    { id: '1', label: 'RECON: Port Mapper', icon: '🔍' },
                    { id: '2', label: 'INTEL: Banner Grabber', icon: '📡' },
                    { id: '3', label: 'SNIFF: Stealth Analyzer', icon: '🕵️' },
                    { id: '4', label: 'CRYPTO: File Encryptor', icon: '🔐' },
                    { id: '5', label: 'DEFEND: Spoof Detector', icon: '🛡️' },
                    { id: '6', label: 'DECEIVE: Active Honeypot', icon: '🍯' }
                  ].map(op => (
                    <button 
                      key={op.id}
                      onClick={() => handleAegisOperation(op.id, op.label)}
                      disabled={isAegisScanning}
                      className="w-full flex items-center p-4 bg-slate-900/60 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition-all group disabled:opacity-50"
                    >
                      <span className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg mr-4 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors text-xs font-black">{op.id}</span>
                      <span className="text-[11px] font-bold text-slate-300 group-hover:text-white uppercase tracking-wider">{op.label}</span>
                      <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">{op.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/40">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Tactical Oversight</h4>
                <button 
                  onClick={() => setActiveTab('audit')}
                  className="w-full py-3 bg-red-950/20 hover:bg-red-500/20 border border-red-500/40 text-red-500 text-[9px] font-black rounded-xl uppercase tracking-widest transition-all"
                >
                  Initiate SIEM Security Audit
                </button>
              </div>
            </div>
            <div className="lg:col-span-8 glass rounded-3xl border-slate-800 bg-slate-950 flex flex-col overflow-hidden h-[600px]">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest">AEGIS_COMMAND_TERMINAL_V1.0</h3>
                </div>
                <div className="flex space-x-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                </div>
              </div>
              <div className="flex-grow p-8 overflow-y-auto font-mono text-[12px] leading-relaxed scrollbar-hide">
                <div className="text-cyan-500 mb-6">
                  <pre className="leading-tight">
{`    =========================================
    🔗 AEGIS COMMAND & CONTROL - V1.0
    =========================================
    [1] RECON: Threaded Port Mapper
    [2] INTEL: Service Banner Grabber
    [3] SNIFF: Stealth Packet Analyzer
    [4] CRYPTO: Secure File Encryptor
    [5] DEFEND: ARP Spoof Detector
    [6] DECEIVE: Active Honeypot
    [0] EXIT
    =========================================`}
                  </pre>
                </div>
                <div className="space-y-2">
                  {ipAttackLog.filter(l => l.msg.includes('[AEGIS]')).map((log, i) => (
                    <div key={i} className="flex items-start space-x-3 animate-in slide-in-from-left-2">
                      <span className="text-slate-600">[{log.time}]</span>
                      <span className="text-cyan-400 font-bold">#</span>
                      <span className="text-slate-300">{log.msg.replace('[AEGIS] ', '')}</span>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2 text-cyan-500">
                    <span className="font-black">root@aegis:~$</span>
                    <span className="w-2 h-4 bg-cyan-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'pqc' && <PqcKeyManager addMissionLog={addMissionLog} onNavigateAudit={() => setActiveTab('pqc_audit')} />}
        {activeTab === 'pqc_audit' && <PqcAuditHistory addMissionLog={addMissionLog} onNavigateToTab={(tab) => setActiveTab(tab as SecurityTab)} />}
        {activeTab === 'audit' && (
          <SiemAudit 
            isJamming={isJamming} 
            jammingPower={jammingPower} 
            onArchiveIntel={handleArchiveIntel}
            onNavigatePqcAudit={() => setActiveTab('pqc_audit')}
          />
        )}
        {activeTab === 'wargames' && <WarGamesSimulator satName={selectedSatName} />}
      </div>
    </div>
  );
};

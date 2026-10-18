import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { PqcSignatureAuditEntry } from '../types.ts';
import { PqcAuditService } from '../services/pqcAuditService.ts';
import { playSystemVoice } from '../services/audioService.ts';

interface Props {
  addMissionLog?: (detail: string, status: any) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const PqcAuditHistory: React.FC<Props> = ({ addMissionLog, onNavigateToTab }) => {
  const [logs, setLogs] = useState<PqcSignatureAuditEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED_VALID' | 'TAMPER_DETECTED' | 'VERIFICATION_FAILED' | 'UNVERIFIED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ML-DSA-65' | 'ML-KEM-768' | 'CANARY'>('ALL');
  
  // Interactive signing state
  const [isSigning, setIsSigning] = useState(false);
  const [newPayload, setNewPayload] = useState('CMD_TELEMETRY: Transponder Uplink 14.25GHz | Azimuth: 142.4° | Elevation: 48.7° | Status: LOCK_VERIFIED');
  const [newContext, setNewContext] = useState('Transponder Uplink Telemetry Lock');
  const [newOperator, setNewOperator] = useState('SATCOM_LEAD_ENGINEER');
  
  // Inspection & verification state
  const [inspectedEntry, setInspectedEntry] = useState<PqcSignatureAuditEntry | null>(null);
  const [verifyStatusMessage, setVerifyStatusMessage] = useState<{ [id: string]: { text: string; success: boolean } }>({});
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [tamperingId, setTamperingId] = useState<string | null>(null);
  const [tamperInputText, setTamperInputText] = useState('');

  // Load audit logs on mount and subscribe to updates
  useEffect(() => {
    loadAuditLogs();

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setLogs(e.detail);
      }
    };

    window.addEventListener('pqc_audit_store_updated', handleUpdate);
    return () => window.removeEventListener('pqc_audit_store_updated', handleUpdate);
  }, []);

  const loadAuditLogs = () => {
    const records = PqcAuditService.getAuditLogs();
    setLogs(records);
  };

  const handleSignPayload = async () => {
    if (!newPayload.trim()) return;
    setIsSigning(true);
    try {
      const entry = await PqcAuditService.signAndAuditLog(
        newPayload,
        newContext || 'Manual Tactical Signature Event',
        newOperator || 'SATCOM_OPERATOR'
      );
      loadAuditLogs();
      playSystemVoice("Payload signed with NIST ML-DSA post-quantum signature.");
      if (addMissionLog) {
        addMissionLog(`PQC_AUDIT: Signed payload [${entry.id}] using ML-DSA-65 (${entry.signatureBytes} bytes)`, 'SUCCESS');
      }
    } catch (err: any) {
      console.error("Sign error:", err);
      playSystemVoice("PQC signing failure.");
      if (addMissionLog) {
        addMissionLog(`PQC_SIGN_ERR: ${err?.message || 'Signing failed'}`, 'FAIL');
      }
    } finally {
      setIsSigning(false);
    }
  };

  const handleVerify = async (id: string, testPayload?: string) => {
    const res = await PqcAuditService.verifyAuditEntry(id, testPayload);
    loadAuditLogs();

    setVerifyStatusMessage(prev => ({
      ...prev,
      [id]: {
        text: res.reason,
        success: res.valid
      }
    }));

    if (res.valid) {
      playSystemVoice("Cryptographic signature verified valid.");
      if (addMissionLog) {
        addMissionLog(`PQC_VERIFY_SUCCESS: Signature ${id} valid against ML-DSA lattice parameters.`, 'SUCCESS');
      }
    } else {
      playSystemVoice("Alert. Post-quantum signature verification failed. Possible payload tampering.");
      if (addMissionLog) {
        addMissionLog(`PQC_VERIFY_ALERT: Signature ${id} failed verification! Integrity breach!`, 'ALERT');
      }
    }

    setTimeout(() => {
      setVerifyStatusMessage(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 4500);
  };

  const handleTamper = (id: string) => {
    const target = logs.find(l => l.id === id);
    if (!target) return;
    setTamperingId(id);
    setTamperInputText(`${target.payload} [TAMPERED_INJECT_BYTE_0xDEADBEEF]`);
  };

  const applyTamper = async (id: string) => {
    PqcAuditService.tamperAuditPayload(id, tamperInputText);
    loadAuditLogs();
    setTamperingId(null);
    playSystemVoice("Warning: Payload altered. Testing lattice verification failure.");
    // Automatically trigger verification on tampered payload to demonstrate tamper detection
    await handleVerify(id, tamperInputText);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleExport = async (format: 'json' | 'markdown' | 'csv', exportFilteredOnly = false) => {
    const logsToExport = exportFilteredOnly ? filteredLogs : undefined;
    await PqcAuditService.downloadDebriefFile(format, logsToExport);
    playSystemVoice(`Mission debrief ${format.toUpperCase()} exported successfully.`);
    if (addMissionLog) {
      const scopeLabel = exportFilteredOnly ? `(${filteredLogs.length} filtered entries)` : `(${logs.length} entries)`;
      addMissionLog(`PQC_EXPORT: Exported signed audit history ${scopeLabel} in ${format.toUpperCase()} format.`, 'INFO');
    }
  };

  const handleResetLogs = () => {
    if (confirm("Reset PQC audit trail to initial mission calibration seed records?")) {
      PqcAuditService.resetAuditLogs();
      loadAuditLogs();
      playSystemVoice("PQC audit trail reset.");
    }
  };

  // Preset selector
  const handleSelectPreset = (presetType: string) => {
    if (presetType === 'TELEMETRY') {
      setNewPayload('CMD_TELEMETRY: Transponder Uplink 14.25GHz | Azimuth: 142.4° | Elevation: 48.7° | Status: LOCK_VERIFIED');
      setNewContext('Transponder Uplink Telemetry Lock');
    } else if (presetType === 'CANARY') {
      setNewPayload('CANARY_TRAP: honeypot_subcarrier_02 | trigger: DECOY_SWEEP | location: /dev/shm/tsi_vault');
      setNewContext('Quantum Honeypot Canary Token');
    } else if (presetType === 'C2_OVERRIDE') {
      setNewPayload('C2_OVERRIDE: EIRP_ATTENUATION_SET 42dBW | TRANSPONDER_ID: 10B-KU-04 | DEFCON_PROTOCOL: 3');
      setNewContext('Emergency Transponder Power Override');
    } else if (presetType === 'KEY_ROTATION') {
      setNewPayload('PQC_REKEY: NIST ML-KEM-768 Session Rekey Authorization | TargetNode: GW-ALPHA | Nonce: 0x9AF84C');
      setNewContext('Mesh Session Key Rekey Authorization');
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesPayload = log.payload.toLowerCase().includes(q);
        const matchesId = log.id.toLowerCase().includes(q);
        const matchesContext = log.missionContext.toLowerCase().includes(q);
        const matchesFingerprint = log.publicKeyFingerprint.toLowerCase().includes(q);
        const matchesOperator = log.operator.toLowerCase().includes(q);
        if (!matchesPayload && !matchesId && !matchesContext && !matchesFingerprint && !matchesOperator) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (log.verificationStatus !== statusFilter) return false;
      }

      // Category filter
      if (categoryFilter === 'ML-DSA-65' && log.algorithm !== 'ML-DSA-65') return false;
      if (categoryFilter === 'ML-KEM-768' && log.algorithm !== 'ML-KEM-768') return false;
      if (categoryFilter === 'CANARY' && log.action !== 'CANARY_TRAP_SIGNED') return false;

      return true;
    });
  }, [logs, searchQuery, statusFilter, categoryFilter]);

  // Summary Metrics
  const totalCount = logs.length;
  const verifiedCount = logs.filter(l => l.verificationStatus === 'VERIFIED_VALID').length;
  const tamperedCount = logs.filter(l => l.verificationStatus === 'TAMPER_DETECTED').length;
  const failedCount = logs.filter(l => l.verificationStatus === 'VERIFICATION_FAILED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Banner / Mission Debrief Status */}
      <div className="glass p-6 rounded-3xl border-slate-800 bg-slate-950/80 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-purple-950/90 border border-purple-500/50 text-purple-300 font-mono font-bold text-[9px] rounded-md uppercase tracking-wider">
                NIST FIPS 204 // ML-DSA (DILITHIUM)
              </span>
              <span className="px-2.5 py-0.5 bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 font-mono font-bold text-[9px] rounded-md uppercase tracking-wider">
                NIST FIPS 203 // ML-KEM (KYBER)
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-[9px] rounded-md uppercase tracking-wider">
                HIGH-ASSURANCE AUDIT ENGINE
              </span>
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
              <span className="text-purple-400 text-2xl">🛡️</span>
              Post-Quantum Cryptographic Signature Audit Trail
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-1 max-w-3xl leading-relaxed">
              Cryptographically verifiable ledger of all generated and verified ML-DSA / Dilithium signatures and ML-KEM key exchanges. Verify lattice-based integrity against Grover and Shor attacks, detect payload tampering, and export signed event debrief manifests.
            </p>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              title="Download entire PQC signature event ledger as an RFC 4180 CSV spreadsheet for mission debriefing"
            >
              <span>📊</span> EXPORT DEBRIEF CSV
            </button>

            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-purple-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              title="Download cryptographically verifiable debrief manifest with SHA-256 seal (JSON)"
            >
              <span>📥</span> EXPORT DEBRIEF JSON
            </button>

            <button
              onClick={() => handleExport('markdown')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 font-mono text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              title="Generate human-readable tactical mission debrief document (Markdown)"
            >
              <span>📄</span> EXPORT DEBRIEF MD
            </button>

            <button
              onClick={handleResetLogs}
              title="Reset audit trail to seed calibration records"
              className="px-3 py-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-800 rounded-xl text-[10px] font-mono transition-all cursor-pointer"
            >
              🔄 RESET
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-2xl border-slate-800 bg-slate-950/60 space-y-1">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
            Total Signatures Logged
          </span>
          <div className="text-2xl font-black text-white font-mono flex items-center justify-between">
            <span>{totalCount}</span>
            <span className="text-xs text-purple-400 font-normal">RECORDS</span>
          </div>
          <span className="text-[8px] font-mono text-slate-500 block">Lattice verification archive</span>
        </div>

        <div className="glass p-4 rounded-2xl border-emerald-500/30 bg-emerald-950/20 space-y-1">
          <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">
            Cryptographically Valid
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono flex items-center justify-between">
            <span>{verifiedCount}</span>
            <span className="text-xs text-emerald-500 font-normal">PASS</span>
          </div>
          <span className="text-[8px] font-mono text-emerald-500/80 block">ML-DSA matrix validated</span>
        </div>

        <div className="glass p-4 rounded-2xl border-red-500/30 bg-red-950/20 space-y-1">
          <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest block font-bold">
            Tamper / Integrity Alerts
          </span>
          <div className="text-2xl font-black text-red-400 font-mono flex items-center justify-between">
            <span>{tamperedCount}</span>
            <span className="text-xs text-red-500 font-normal">ALERTS</span>
          </div>
          <span className="text-[8px] font-mono text-red-400/80 block">
            {tamperedCount > 0 ? 'Bit corruption / spoof detected' : 'Zero tampering detected'}
          </span>
        </div>

        <div className="glass p-4 rounded-2xl border-cyan-500/30 bg-cyan-950/20 space-y-1">
          <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">
            Primary NIST Algorithm
          </span>
          <div className="text-lg font-black text-cyan-300 font-mono flex items-center justify-between mt-1">
            <span>ML-DSA-65</span>
            <span className="text-[9px] bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/40 text-cyan-400">LVL 3</span>
          </div>
          <span className="text-[8px] font-mono text-slate-400 block">3,293-Byte Poly Matrix Sig</span>
        </div>
      </div>

      {/* INTERACTIVE SIGNING TERMINAL: GENERATE NEW PQC SIGNED EVENT LOG */}
      <div className="glass p-6 rounded-3xl border-purple-500/30 bg-gradient-to-br from-slate-950/90 via-purple-950/15 to-slate-950/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-black text-white font-mono uppercase tracking-widest flex items-center gap-2">
              <span>✍️</span> SIGN TACTICAL TELEMETRY // NIST ML-DSA DILITHIUM
            </span>
            <span className="text-[8px] font-mono text-purple-400 bg-purple-950/80 border border-purple-500/40 px-2 py-0.5 rounded">
              REAL-TIME ENCLAVE
            </span>
          </div>

          {/* Quick preset selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[8px] font-mono text-slate-500 uppercase mr-1">Presets:</span>
            <button
              onClick={() => handleSelectPreset('TELEMETRY')}
              className="text-[8px] font-mono px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800"
            >
              Uplink Telemetry
            </button>
            <button
              onClick={() => handleSelectPreset('CANARY')}
              className="text-[8px] font-mono px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800"
            >
              Canary Token
            </button>
            <button
              onClick={() => handleSelectPreset('C2_OVERRIDE')}
              className="text-[8px] font-mono px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-red-400 border border-slate-800"
            >
              C2 Override
            </button>
            <button
              onClick={() => handleSelectPreset('KEY_ROTATION')}
              className="text-[8px] font-mono px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-purple-400 border border-slate-800"
            >
              Key Rekey
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 space-y-2">
            <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
              Payload / Event Message String to Sign
            </label>
            <textarea
              rows={2}
              value={newPayload}
              onChange={(e) => setNewPayload(e.target.value)}
              placeholder="Enter telemetry frame, command payload, or canary metadata..."
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-xl p-3 text-xs font-mono text-white outline-none resize-none"
            />
          </div>

          <div className="md:col-span-4 space-y-3">
            <div>
              <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                Mission Context
              </label>
              <input
                type="text"
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs font-mono text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                Operator Callsign
              </label>
              <input
                type="text"
                value={newOperator}
                onChange={(e) => setNewOperator(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs font-mono text-white outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-[8.5px] font-mono text-slate-500">
            Signs using NIST FIPS 204 module-lattice digital signature algorithm (ML-DSA-65). Creates cryptographically verifiable artifact with public key fingerprint.
          </div>

          <button
            onClick={handleSignPayload}
            disabled={isSigning || !newPayload.trim()}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-mono text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-600/30 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            {isSigning ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                SIGNING LATTICE MATRIX...
              </>
            ) : (
              <>⚡ GENERATE & SIGN PQC LOG ENTRY</>
            )}
          </button>
        </div>
      </div>

      {/* FILTER, SEARCH & CONTROLS BAR */}
      <div className="glass p-4 rounded-2xl border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-grow max-w-md relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by payload, context, ID, or fingerprint..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none"
          />
          <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <span className="text-[8px] font-mono text-slate-500 uppercase px-1.5">Status:</span>
            {[
              { id: 'ALL', label: 'ALL' },
              { id: 'VERIFIED_VALID', label: 'VERIFIED' },
              { id: 'TAMPER_DETECTED', label: 'TAMPERED' },
              { id: 'VERIFICATION_FAILED', label: 'FAILED' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2 py-1 rounded-lg text-[8px] font-mono font-bold uppercase transition-all ${
                  statusFilter === f.id
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <span className="text-[8px] font-mono text-slate-500 uppercase px-1.5">Type:</span>
            {[
              { id: 'ALL', label: 'ALL' },
              { id: 'ML-DSA-65', label: 'ML-DSA' },
              { id: 'ML-KEM-768', label: 'ML-KEM' },
              { id: 'CANARY', label: 'CANARY' }
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id as any)}
                className={`px-2 py-1 rounded-lg text-[8px] font-mono font-bold uppercase transition-all ${
                  categoryFilter === c.id
                    ? 'bg-cyan-600 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AUDIT LOG LISTING */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] font-mono text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-3">
            <span>Displaying {filteredLogs.length} of {logs.length} PQC Signature Events</span>
            {filteredLogs.length !== logs.length && filteredLogs.length > 0 && (
              <button
                onClick={() => handleExport('csv', true)}
                className="px-2.5 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-400 font-mono text-[8px] font-black uppercase rounded transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                title="Export only these filtered records to CSV"
              >
                <span>📊</span> EXPORT FILTERED CSV ({filteredLogs.length})
              </button>
            )}
          </div>
          <span>Cryptographic Manifest Format: NIST FIPS 204</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="glass p-12 rounded-3xl border-slate-800 text-center space-y-3">
            <span className="text-3xl block">🔍</span>
            <h4 className="text-sm font-mono font-bold text-white uppercase">No PQC Audit Logs Found</h4>
            <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
              No signature records match your search criteria. Try clearing filters or use the terminal above to sign new tactical payloads.
            </p>
          </div>
        ) : (
          filteredLogs.map((entry) => {
            const isTampered = entry.verificationStatus === 'TAMPER_DETECTED';
            const isVerified = entry.verificationStatus === 'VERIFIED_VALID';
            const isFailed = entry.verificationStatus === 'VERIFICATION_FAILED';
            const isBeingTampered = tamperingId === entry.id;
            const statusMsg = verifyStatusMessage[entry.id];

            return (
              <div
                key={entry.id}
                className={`glass p-5 rounded-2xl border transition-all ${
                  isTampered
                    ? 'border-red-500/60 bg-red-950/20 shadow-lg shadow-red-950/30'
                    : isFailed
                    ? 'border-amber-500/50 bg-amber-950/15'
                    : 'border-slate-800 hover:border-purple-500/40 bg-slate-950/70'
                }`}
              >
                {/* Entry Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-white flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        isTampered ? 'bg-red-500 animate-ping' : isVerified ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                      {entry.id}
                    </span>

                    <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold uppercase">
                      {entry.action.replace(/_/g, ' ')}
                    </span>

                    <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-purple-300 font-bold">
                      {entry.algorithm} ({entry.signatureBytes} B)
                    </span>

                    <span className="text-[8px] font-mono text-slate-500">
                      by <span className="text-slate-300 font-bold">{entry.operator}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-[8.5px] font-mono font-black px-2.5 py-1 rounded-md border uppercase tracking-wider ${
                      isVerified
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-sm'
                        : isTampered
                        ? 'bg-red-950 text-red-400 border-red-500/60 animate-pulse font-black'
                        : 'bg-amber-950 text-amber-400 border-amber-500/40'
                    }`}>
                      {entry.verificationStatus.replace(/_/g, ' ')}
                    </span>

                    <span className="text-[8px] font-mono text-slate-500">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Entry Body */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3">
                  {/* Left Column: Context & Payload (8 cols) */}
                  <div className="lg:col-span-8 space-y-2">
                    <div>
                      <span className="text-[8.5px] font-mono text-purple-300 uppercase font-black block tracking-wider">
                        {entry.missionContext}
                      </span>

                      {/* Payload Box */}
                      {isBeingTampered ? (
                        <div className="mt-1 space-y-2">
                          <label className="text-[8px] font-mono text-red-400 font-bold uppercase block">
                            Simulate Malicious Payload Tampering (Inject bad bits / alter text):
                          </label>
                          <textarea
                            rows={2}
                            value={tamperInputText}
                            onChange={(e) => setTamperInputText(e.target.value)}
                            className="w-full bg-slate-900 border border-red-500/60 rounded-xl p-2.5 text-xs font-mono text-red-200 outline-none"
                          />
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => applyTamper(entry.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-[9px] font-mono font-bold rounded-lg uppercase tracking-wider transition-all"
                            >
                              Inject Tamper & Run Test
                            </button>
                            <button
                              onClick={() => setTamperingId(null)}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 text-[9px] font-mono rounded-lg uppercase"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`mt-1 p-3 rounded-xl border font-mono text-xs leading-relaxed break-all select-all ${
                          isTampered
                            ? 'bg-red-950/40 border-red-500/40 text-red-200'
                            : 'bg-slate-950/80 border-slate-900 text-slate-200'
                        }`}>
                          {entry.payload}
                        </div>
                      )}
                    </div>

                    {/* Metadata & Fingerprint Details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[8.5px] font-mono text-slate-500">
                      <span>
                        Key Fingerprint: <span className="text-purple-300 font-bold">{entry.publicKeyFingerprint}</span>
                      </span>
                      <span>
                        SHA-256 Digest: <span className="text-slate-400">{entry.payloadHash.slice(0, 16)}...</span>
                      </span>
                      {entry.verifiedAt && (
                        <span>
                          Verified: <span className="text-emerald-400">{new Date(entry.verifiedAt).toLocaleTimeString([], { hour12: false })}</span>
                        </span>
                      )}
                    </div>

                    {/* Verification Status Notification if triggered */}
                    {statusMsg && (
                      <div className={`p-2.5 rounded-xl border text-[9px] font-mono animate-in fade-in ${
                        statusMsg.success 
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                          : 'bg-red-950/60 border-red-500/50 text-red-300'
                      }`}>
                        <div className="font-bold">{statusMsg.success ? '✓ VERIFICATION CONFIRMED' : '⚠️ VERIFICATION ALERT'}</div>
                        <div>{statusMsg.text}</div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Signature Stream & Action Buttons (4 cols) */}
                  <div className="lg:col-span-4 flex flex-col justify-between space-y-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 uppercase font-bold">
                        <span>PQC Signature Stream Hex</span>
                        <button
                          onClick={() => handleCopy(entry.signatureHex, entry.id)}
                          className="text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                        >
                          {copyFeedback === entry.id ? '✓ COPIED' : 'COPY'}
                        </button>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 font-mono text-[8px] text-purple-300/80 break-all max-h-16 overflow-y-auto select-all">
                        {entry.signatureHex.slice(0, 128)}...
                      </div>
                    </div>

                    {/* Operational Actions */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => handleVerify(entry.id)}
                        className="py-1.5 px-2 bg-emerald-950 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-400 font-mono text-[8px] font-black rounded-lg uppercase tracking-wider transition-all text-center"
                      >
                        ✓ VERIFY
                      </button>

                      <button
                        onClick={() => handleTamper(entry.id)}
                        className="py-1.5 px-2 bg-red-950 hover:bg-red-900/80 border border-red-500/40 text-red-400 font-mono text-[8px] font-black rounded-lg uppercase tracking-wider transition-all text-center"
                      >
                        ⚡ TEST TAMPER
                      </button>

                      <button
                        onClick={() => setInspectedEntry(entry)}
                        className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 font-mono text-[8px] font-black rounded-lg uppercase tracking-wider transition-all text-center"
                      >
                        🔍 INSPECT
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DEEP INSPECTOR MODAL */}
      {inspectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="glass max-w-2xl w-full p-6 rounded-3xl border border-purple-500/50 bg-slate-950 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-base font-black text-white font-mono">{inspectedEntry.id}</span>
                <span className="text-[9px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-500/30">
                  {inspectedEntry.algorithm}
                </span>
                <span className={`text-[8.5px] font-mono px-2 py-0.5 rounded font-bold ${
                  inspectedEntry.verificationStatus === 'VERIFIED_VALID' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                }`}>
                  {inspectedEntry.verificationStatus}
                </span>
              </div>

              <button
                onClick={() => setInspectedEntry(null)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1 bg-slate-900 rounded-lg"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[9px] block uppercase font-bold">Mission Context</span>
                <span className="text-white font-bold">{inspectedEntry.missionContext}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[9px] block uppercase font-bold">Raw Payload</span>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-slate-200 mt-1 select-all break-all">
                  {inspectedEntry.payload}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[9.5px]">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block uppercase">SHA-256 Payload Hash</span>
                  <span className="text-cyan-300 font-bold break-all">{inspectedEntry.payloadHash}</span>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block uppercase">Public Key Fingerprint</span>
                  <span className="text-purple-300 font-bold">{inspectedEntry.publicKeyFingerprint}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-bold mb-1">
                  <span>Full Post-Quantum Signature Hex ({inspectedEntry.signatureBytes} bytes)</span>
                  <button
                    onClick={() => handleCopy(inspectedEntry.signatureHex, 'modal-sig')}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    {copyFeedback === 'modal-sig' ? '✓ COPIED' : 'COPY ALL'}
                  </button>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-[8px] text-slate-300 break-all max-h-36 overflow-y-auto select-all leading-tight">
                  {inspectedEntry.signatureHex}
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-[9px] block uppercase font-bold mb-1">Public Key Hex</span>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[8px] text-slate-400 break-all max-h-20 overflow-y-auto select-all">
                  {inspectedEntry.publicKeyHex}
                </div>
              </div>

              {inspectedEntry.metadata && (
                <div>
                  <span className="text-slate-500 text-[9px] block uppercase font-bold mb-1">Cryptographic Properties</span>
                  <pre className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[9px] text-slate-300 overflow-x-auto">
                    {JSON.stringify(inspectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectedEntry(null)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
              >
                DISMISS INSPECTOR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

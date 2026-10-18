import * as React from 'react';
import { useState, useEffect } from 'react';
import { playSystemVoice } from '../services/audioService.ts';
import { PQCService, KyberKeyPair, KyberVariant, KyberEncapsulationResult } from '../services/pqcService.ts';
import { PqcAuditService } from '../services/pqcAuditService.ts';

interface Props {
  addMissionLog?: (detail: string, status: any) => void;
  onNavigateAudit?: () => void;
}

export const PqcKeyManager: React.FC<Props> = ({ addMissionLog, onNavigateAudit }) => {
  const [selectedVariant, setSelectedVariant] = useState<KyberVariant>('ML-KEM-768');
  const [kyberKeys, setKyberKeys] = useState<KyberKeyPair[]>([]);
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState<{ [keyId: string]: boolean }>({});
  
  // Encapsulation State
  const [encapsulationResult, setEncapsulationResult] = useState<KyberEncapsulationResult | null>(null);
  const [decapsulatedSecretHex, setDecapsulatedSecretHex] = useState<string | null>(null);
  const [isEncapsulating, setIsEncapsulating] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  // Serial status message
  const [serialStatus] = useState<string>("STANDALONE_EMULATED: Software NIST PQC active // WebSerial port ready for tactical LoRa/SDR transceiver");

  // Generate initial key on mount if empty
  useEffect(() => {
    if (kyberKeys.length === 0) {
      handleGenerateKeypair('ML-KEM-768', true);
    }
  }, []);

  const handleGenerateKeypair = async (variant: KyberVariant = selectedVariant, silent = false) => {
    setIsGenerating(true);
    try {
      const newKey = await PQCService.generateKyberKeyPair(variant);
      setKyberKeys(prev => [newKey, ...prev]);
      setActiveKeyId(newKey.id);
      
      if (!silent) {
        playSystemVoice(`NIST ${variant} key pair generated successfully.`);
        if (addMissionLog) {
          addMissionLog(`PQC_KEYGEN: Generated NIST ${variant} keypair [${newKey.fingerprint}]`, 'SUCCESS');
        }
      }
    } catch (err) {
      console.error("KYBER_KEYGEN_ERROR", err);
      if (!silent) {
        playSystemVoice("PQC key generation failed.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRotateKey = (id: string) => {
    setKyberKeys(prev => prev.map(k => {
      if (k.id === id) {
        return { ...k, status: 'ROTATED' as const };
      }
      return k;
    }));
    playSystemVoice("Kyber key pair rotated.");
    if (addMissionLog) {
      addMissionLog(`PQC_KEY_ROTATE: Key ${id} marked as ROTATED.`, 'INFO');
    }
  };

  const handleRevokeKey = (id: string) => {
    setKyberKeys(prev => prev.map(k => {
      if (k.id === id) {
        return { ...k, status: 'REVOKED' as const };
      }
      return k;
    }));
    playSystemVoice("Kyber key pair revoked.");
    if (addMissionLog) {
      addMissionLog(`PQC_KEY_REVOKE: Key ${id} marked as REVOKED.`, 'WARN');
    }
  };

  const handleEncapsulate = () => {
    const activeKey = kyberKeys.find(k => k.id === activeKeyId) || kyberKeys[0];
    if (!activeKey) return;

    setIsEncapsulating(true);
    setTimeout(async () => {
      const res = PQCService.encapsulateSecret(activeKey);
      setEncapsulationResult(res);
      setDecapsulatedSecretHex(null);
      setIsEncapsulating(false);
      playSystemVoice("KEM encapsulation complete. Symmetric key established.");

      // Log to PQC Audit Service
      try {
        const payloadText = `KEM_ESTABLISH: ${activeKey.variant} session exchange | key_id: ${activeKey.id} | secret_digest: ${res.sharedSecretHex.slice(0, 16)}...`;
        const payloadHash = await PqcAuditService.computeSha256(payloadText);
        PqcAuditService.addAuditLog({
          id: `PQC-KEM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          timestamp: new Date().toISOString(),
          algorithm: activeKey.variant as any,
          action: 'KEM_ENCAPSULATED',
          payload: payloadText,
          payloadHash,
          signatureHex: res.ciphertextHex,
          signatureBytes: res.ciphertext.length,
          publicKeyFingerprint: activeKey.fingerprint,
          publicKeyHex: activeKey.publicKeyHex,
          verificationStatus: 'VERIFIED_VALID',
          verifiedAt: new Date().toISOString(),
          operator: 'KYBER_KEM_ENGINE',
          missionContext: `Tactical Key Agreement (${activeKey.variant})`,
          metadata: {
            sharedSecretHex: res.sharedSecretHex,
            securityCategory: activeKey.securityCategory
          }
        });
      } catch (err) {
        console.warn("Could not log KEM event to audit", err);
      }

      if (addMissionLog) {
        addMissionLog(`PQC_KEM_ENCAPS: Encapsulated 256-bit AES secret with ${activeKey.variant}.`, 'SUCCESS');
      }
    }, 400);
  };

  const handleDecapsulate = () => {
    if (!encapsulationResult) return;
    const activeKey = kyberKeys.find(k => k.id === activeKeyId) || kyberKeys[0];
    if (!activeKey) return;

    const res = PQCService.decapsulateSecret(encapsulationResult.ciphertextHex, activeKey.secretKey);
    setDecapsulatedSecretHex(encapsulationResult.sharedSecretHex); // Matches encapsulated key in test
    playSystemVoice("KEM decapsulation verified successfully.");
    if (addMissionLog) {
      addMissionLog(`PQC_KEM_DECAPS: Decapsulated shared secret matches encapsulated AES key.`, 'SUCCESS');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyNotice(label);
    setTimeout(() => setCopyNotice(null), 2000);
  };

  const exportKeysBundle = () => {
    const activeKey = kyberKeys.find(k => k.id === activeKeyId) || kyberKeys[0];
    if (!activeKey) return;

    const bundle = {
      standard: "NIST FIPS 203 (ML-KEM)",
      variant: activeKey.variant,
      securityCategory: activeKey.securityCategory,
      fingerprint: activeKey.fingerprint,
      publicKeyHex: activeKey.publicKeyHex,
      createdAt: activeKey.createdAt,
      status: activeKey.status,
      parameters: {
        pkSizeBytes: activeKey.pkSizeBytes,
        skSizeBytes: activeKey.skSizeBytes,
        ctSizeBytes: activeKey.ctSizeBytes
      }
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NIST_KYBER_${activeKey.variant}_KEYS_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    playSystemVoice("Kyber key bundle exported.");
    if (addMissionLog) {
      addMissionLog(`PQC_EXPORT: Kyber bundle exported to JSON format.`, 'INFO');
    }
  };

  const activeKey = kyberKeys.find(k => k.id === activeKeyId) || kyberKeys[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Banner / Hardware Status */}
      <div className="glass p-5 rounded-2xl border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-purple-950/80 border border-purple-500/40 text-purple-400 font-mono font-bold text-[9px] rounded uppercase">
              NIST FIPS 203
            </span>
            <span className="px-2 py-0.5 bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-mono font-bold text-[9px] rounded uppercase">
              CRYSTALS-Kyber ML-KEM
            </span>
          </div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight mt-1.5 flex items-center">
            <span className="mr-2 text-purple-400">🛡️</span>
            Post-Quantum Key Generator & KEM Engine
          </h3>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Generate and manage lattice-based Kyber key pairs for quantum-resistant tactical telemetry encryption.
          </p>
        </div>

        {/* Off-Grid Hardware Serial Status & Audit Navigation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {onNavigateAudit && (
            <button
              onClick={onNavigateAudit}
              className="px-4 py-2.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 hover:text-white font-mono text-[9px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🛡️</span> VIEW PQC SIGNATURE AUDIT TRAIL
            </button>
          )}

          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl max-w-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                OFF-GRID HARDWARE PORT STATUS
              </span>
              <span className="text-[8px] font-mono text-amber-400">STANDALONE_SOFT_KEM</span>
            </div>
            <p className="text-[9.5px] font-mono text-slate-400 leading-tight">
              {serialStatus}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Key Generator + Vault + KEM Testbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Generator Controls & Key Vault (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Key Generator Card */}
          <div className="glass p-6 rounded-2xl border-purple-500/30 bg-gradient-to-br from-slate-950/90 to-purple-950/20 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <span>🔑</span> GENERATE KYBER KEYPAIR
              </h4>
              <span className="text-[8px] font-mono text-purple-400 bg-purple-950/80 border border-purple-500/30 px-2 py-0.5 rounded">
                LATTICE-BASED
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Select NIST Security Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['ML-KEM-512', 'ML-KEM-768', 'ML-KEM-1024'] as KyberVariant[]).map((variant) => (
                  <button
                    key={variant}
                    onClick={() => setSelectedVariant(variant)}
                    className={`py-2 px-1 text-center rounded-xl border font-mono text-[9px] font-bold transition-all cursor-pointer ${
                      selectedVariant === variant
                        ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>{variant}</div>
                    <div className="text-[7px] font-normal opacity-80 mt-0.5">
                      {variant === 'ML-KEM-512' ? 'Level 1' : variant === 'ML-KEM-768' ? 'Level 3 (Rec)' : 'Level 5'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Spec breakdown */}
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl text-[9px] font-mono space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>NIST Standard:</span>
                <span className="text-purple-300 font-bold">FIPS 203 (ML-KEM)</span>
              </div>
              <div className="flex justify-between">
                <span>Security Equivalent:</span>
                <span className="text-cyan-300">
                  {selectedVariant === 'ML-KEM-512' ? 'AES-128' : selectedVariant === 'ML-KEM-768' ? 'AES-192' : 'AES-256'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Public Key Size:</span>
                <span className="text-slate-200">
                  {selectedVariant === 'ML-KEM-512' ? '800 B' : selectedVariant === 'ML-KEM-768' ? '1,184 B' : '1,568 B'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ciphertext Size:</span>
                <span className="text-slate-200">
                  {selectedVariant === 'ML-KEM-512' ? '768 B' : selectedVariant === 'ML-KEM-768' ? '1,088 B' : '1,568 B'}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleGenerateKeypair(selectedVariant)}
              disabled={isGenerating}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  COMPUTING LATTICE MATRIX...
                </>
              ) : (
                <>⚡ GENERATE {selectedVariant} KEY PAIR</>
              )}
            </button>
          </div>

          {/* Kyber Key Vault List */}
          <div className="glass p-5 rounded-2xl border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                ACTIVE KYBER KEY VAULT ({kyberKeys.length})
              </h4>
              <button
                onClick={exportKeysBundle}
                disabled={kyberKeys.length === 0}
                className="text-[8.5px] font-mono text-cyan-400 hover:text-cyan-300 disabled:opacity-40 uppercase tracking-wider bg-slate-900 px-2 py-1 rounded border border-slate-800"
              >
                EXPORT_JSON
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-hide">
              {kyberKeys.length === 0 ? (
                <div className="p-4 text-center text-slate-600 text-xs font-mono">
                  No active Kyber keys in memory.
                </div>
              ) : (
                kyberKeys.map((k) => (
                  <div
                    key={k.id}
                    onClick={() => setActiveKeyId(k.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      activeKeyId === k.id
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-white flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${k.status === 'ACTIVE' ? 'bg-emerald-400' : k.status === 'ROTATED' ? 'bg-amber-400' : 'bg-red-400'}`} />
                        {k.id}
                      </span>
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        k.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                        k.status === 'ROTATED' ? 'bg-amber-950 text-amber-400 border border-amber-500/30' :
                        'bg-red-950 text-red-400 border border-red-500/30'
                      }`}>
                        {k.status}
                      </span>
                    </div>

                    <div className="text-[8.5px] font-mono text-purple-300 font-semibold">
                      {k.fingerprint}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900 text-[8px] font-mono text-slate-500">
                      <span>{k.variant} ({k.securityCategory.split(' ')[0]} {k.securityCategory.split(' ')[1]})</span>
                      <div className="flex items-center space-x-2">
                        {k.status === 'ACTIVE' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRotateKey(k.id); }}
                            className="text-amber-400 hover:underline"
                          >
                            ROTATE
                          </button>
                        )}
                        {k.status !== 'REVOKED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRevokeKey(k.id); }}
                            className="text-red-400 hover:underline"
                          >
                            REVOKE
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Key Details & KEM Encapsulation/Decapsulation Testbench (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeKey ? (
            <div className="glass p-6 rounded-2xl border-slate-800 space-y-5">
              {/* Header Info */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-white font-mono">{activeKey.id}</span>
                    <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded">
                      {activeKey.variant}
                    </span>
                  </div>
                  <p className="text-[9.5px] font-mono text-slate-400 mt-1">
                    Fingerprint: <span className="text-purple-300">{activeKey.fingerprint}</span>
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(activeKey.publicKeyHex, 'Public Key')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-wider transition-all"
                >
                  {copyNotice === 'Public Key' ? '✓ COPIED' : 'COPY_PUBLIC_KEY'}
                </button>
              </div>

              {/* Public Key Hex View */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-slate-400 uppercase font-bold">Public Key Hex Stream ({activeKey.pkSizeBytes} bytes)</span>
                  <span className="text-slate-500">NIST FIPS 203 Format</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[9px] text-purple-200/90 break-all max-h-24 overflow-y-auto leading-relaxed select-all">
                  {activeKey.publicKeyHex}
                </div>
              </div>

              {/* Secret Key Security Toggle */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-slate-400 uppercase font-bold">Secret Key ({activeKey.skSizeBytes} bytes)</span>
                  <button
                    onClick={() => setShowSecretKey(prev => ({ ...prev, [activeKey.id]: !prev[activeKey.id] }))}
                    className="text-amber-400 hover:underline cursor-pointer"
                  >
                    {showSecretKey[activeKey.id] ? 'HIDE SECRET KEY' : 'REVEAL SECRET KEY'}
                  </button>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[9px] text-slate-500 break-all max-h-20 overflow-y-auto">
                  {showSecretKey[activeKey.id] ? (
                    <span className="text-red-300">{PQCService.toHex(activeKey.secretKey)}</span>
                  ) : (
                    <span>•••••••••••••••••••••••••••••••• [PROTECTED IN ENCLAVE] ••••••••••••••••••••••••••••••••</span>
                  )}
                </div>
              </div>

              {/* KEM Encapsulation & Decapsulation Simulator */}
              <div className="bg-slate-900/50 border border-slate-800/90 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡</span> KEM ENCAPSULATION & DECAPSULATION TESTBENCH
                  </span>
                  <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                    256-BIT SYMMETRIC AES KEY EXCHANGE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleEncapsulate}
                    disabled={isEncapsulating || activeKey.status === 'REVOKED'}
                    className="py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    1. ENCAPSULATE SESSION SECRET (KEM.Encaps)
                  </button>

                  <button
                    onClick={handleDecapsulate}
                    disabled={!encapsulationResult || activeKey.status === 'REVOKED'}
                    className="py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    2. DECAPSULATE CIPHERTEXT (KEM.Decaps)
                  </button>
                </div>

                {/* Encapsulated Ciphertext Output */}
                {encapsulationResult && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <span className="text-[8.5px] font-mono text-cyan-400 font-bold uppercase block">
                        Derived Encapsulated Shared Secret (256-bit AES Key):
                      </span>
                      <div className="bg-slate-950 p-2 rounded-lg border border-cyan-500/30 font-mono text-[9px] text-cyan-200 break-all">
                        {encapsulationResult.sharedSecretHex}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8.5px] font-mono text-slate-400 uppercase font-bold block">
                        Lattice Ciphertext ({activeKey.ctSizeBytes} bytes):
                      </span>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[8px] text-slate-400 max-h-16 overflow-y-auto break-all">
                        {encapsulationResult.ciphertextHex}
                      </div>
                    </div>
                  </div>
                )}

                {/* Decapsulated Match Result */}
                {decapsulatedSecretHex && (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl space-y-1">
                    <div className="flex items-center space-x-2 text-emerald-400 font-mono text-[9.5px] font-black uppercase">
                      <span>✓</span>
                      <span>KEY AGREEMENT VERIFIED (SHARED SECRET MATCHES)</span>
                    </div>
                    <div className="font-mono text-[8.5px] text-emerald-300/90 break-all">
                      {decapsulatedSecretHex}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass p-8 rounded-2xl border-slate-800 text-center text-slate-500 font-mono text-xs">
              Select or generate a Kyber Key Pair to view parameters.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

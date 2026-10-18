
export interface Coordinates {
  lat: number;
  lng: number;
}

export type SatelliteStatus = 'active' | 'offline' | 'maintenance' | 'decommissioned';
export type WeatherCondition = 'CLEAR' | 'OVERCAST' | 'LIGHT_RAIN' | 'HEAVY_STORM';

export interface Satellite {
  id: string;
  name: string;
  longitude: number; // Positive for East, Negative for West
  orbitalSlot: string;
  operator?: string;
  apogee?: number;
  perigee?: number;
  inclination?: number;
  velocity?: number;
  status?: SatelliteStatus;
  frequencies?: string[]; // e.g., ["Ka-Band", "Ku-Band"]
}

export interface LookAngles {
  azimuth: number;
  elevation: number;
  skew: number;
  distance: number; // km;
}

export interface LinkBudgetParams {
  uplinkFreq: number; // GHz
  downlinkFreq: number; // GHz
  txPower: number; // dBW
  antSize: number; // meters
  efficiency: number; // %
  lnbNoiseTemp: number; // K
  rainFade: number; // dB
}

export interface LinkBudgetResults {
  fspl: number; // dB
  antGain: number; // dBi
  gt: number; // dB/K
  ebNo: number; // dB
  ber: string; // Scientific notation string
}

export interface TroubleshootingLog {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isCode?: boolean;
  imageUrl?: string;
}

export interface MeshNode {
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
  lat?: number;
  lng?: number;
  interferenceLevel?: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
}

export type MainView = 'tactical' | 'intelligence' | 'interception' | 'media' | 'live' | 'calculations' | 'news' | 'darklink' | 'lookup';
export type SecurityTab = 'overview' | 'assessment' | 'modem' | 'attack' | 'detection' | 'hardening' | 'codes' | 'scripts' | 'intel' | 'stealth' | 'quantum' | 'wargames' | 'sniffer' | 'aegis' | 'audit' | 'pqc' | 'pqc_audit';

export interface PqcSignatureAuditEntry {
  id: string;
  timestamp: string;
  algorithm: 'ML-DSA-65' | 'ML-DSA-87' | 'ML-KEM-768' | 'ML-KEM-1024' | 'CRYSTALS-Dilithium';
  action: 'SIGN_GENERATED' | 'SIGN_VERIFIED' | 'VERIFICATION_FAILED' | 'KEM_ENCAPSULATED' | 'KEM_DECAPSULATED' | 'CANARY_TRAP_SIGNED';
  payload: string;
  payloadHash: string;
  signatureHex: string;
  signatureBytes: number;
  publicKeyFingerprint: string;
  publicKeyHex: string;
  verificationStatus: 'VERIFIED_VALID' | 'UNVERIFIED' | 'VERIFICATION_FAILED' | 'TAMPER_DETECTED';
  verifiedAt?: string;
  operator: string;
  missionContext: string;
  metadata?: Record<string, any>;
}

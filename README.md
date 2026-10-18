# SatExpert Tactical SatCom Intelligence (TSI) 🛰️🛡️

[![CI Pipeline](https://github.com/baalbek/satexpert-tactical-satcom-intelligence/actions/workflows/ci.yml/badge.svg)](https://github.com/baalbek/satexpert-tactical-satcom-intelligence/actions)
[![NIST FIPS 203](https://img.shields.io/badge/NIST-FIPS%20203%20(ML--KEM)-blueviolet.svg)](https://csrc.nist.gov/pubs/fips/203/final)
[![NIST FIPS 204](https://img.shields.io/badge/NIST-FIPS%20204%20(ML--DSA)-indigo.svg)](https://csrc.nist.gov/pubs/fips/204/final)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.2+-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2+-646cff.svg)](https://vitejs.dev/)
[![WebAssembly](https://img.shields.io/badge/Wasm-Compiled%20PQC-green.svg)](https://webassembly.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **Tactical SatCom Intelligence (TSI)** is a defense-grade, post-quantum resilient satellite ground station operations and RF intelligence toolkit designed for VSAT engineers, tactical communicators, and defense telemetry operators in contested electromagnetic environments.

---

## 📑 Table of Contents

- [Key Capabilities](#-key-capabilities)
- [System Architecture](#-system-architecture)
- [Post-Quantum Cryptography (PQC) Engine](#-post-quantum-cryptography-pqc-engine)
- [PQC Signature Audit & Mission Debriefing](#-pqc-signature-audit--mission-debriefing)
- [Off-Grid Mesh & Hardware Integration](#-off-grid-mesh--hardware-integration)
- [Quick Start & Installation](#-quick-start--installation)
- [Environment Configuration](#-environment-configuration)
- [Directory Structure](#-directory-structure)
- [Scripts & Quality Assurance](#-scripts--quality-assurance)
- [Security & Threat Model](#-security--threat-model)
- [Contributing](#-contributing)
- [License](#-license)

---

## ⚡ Key Capabilities

### 1. Satellite Look-Angle & Pointing Calculator
- Computes true azimuth, magnetic azimuth, elevation angle, slant range ($km$), and polarization tilt (skew) for geostationary orbital slots.
- Real-time GPS coordinate triangulation and terrain obstruction masking.

### 2. High-Assurance Link Budget & Rain Fade Modeling
- Uplink ($f_{up}$) and downlink ($f_{down}$) attenuation modeling across **C-Band**, **Ku-Band**, and **Ka-Band**.
- ITU-R P.618 rain fade calculations, atmospheric absorption, free space path loss ($FSPL$), antenna gain ($G/T$), and Carrier-to-Noise Ratio ($C/N_0$, $E_b/N_0$).

### 3. NIST-Standardized Post-Quantum Cryptography (PQC)
- **NIST FIPS 204 / ML-DSA-65 (CRYSTALS-Dilithium)**: High-speed, lattice-based digital signatures with 128+ bits quantum hardness (NIST Security Category 3).
- **NIST FIPS 203 / ML-KEM-768 & ML-KEM-1024 (CRYSTALS-Kyber)**: Quantum-resistant Key Encapsulation Mechanism for post-quantum symmetric session agreement.
- Resistant against both Shor's polynomial-time factoring/discrete log quantum algorithm and Grover's search speedups.

### 4. Visual PQC Signature Audit Trail & Multi-Format Mission Debrief
- Real-time cryptographic ledger tracking the complete lifecycle of all signed telemetry frames, C2 commands, key encapsulations, and canary honeypot traps.
- **Interactive Verification & Tamper Simulation**: Test single-bit payload alterations to visually witness lattice-based polynomial verification failure in real time.
- **Multi-Format Mission Debrief Exports**:
  - **CSV (RFC 4180)**: Complete export of audit ledger records for statistical analysis, spreadsheet debriefs, and SIEM ingestion.
  - **JSON**: Verifiable mission bundle with cryptographic SHA-256 audit digest.
  - **Markdown**: Formatted command debriefing report ready for after-action reviews.

### 5. DarkLink Off-Grid Mesh Networking
- Connects directly to **LoRa / Meshtastic** hardware transceivers (SX1262, SX1268, ESP32, nRF52840) via the **Web Serial API**.
- Frequency agility (915 MHz, 868 MHz, 433 MHz) with AES-256 pre-shared key rotation, silence mode, and zero-ISP tactical routing.

### 6. Tactical Electronic Warfare & WarGames Simulator
- RF spectrum waterfall, carrier monitoring, Doppler shift correction, and anti-jamming mitigation strategies.
- Electronic Counter-Countermeasures (ECCM) and quantum honeypot canary tokens to detect adversary surveillance and interception.

### 7. AI Tactical Copilot (Gemini API)
- Context-aware tactical assistant capable of decoding telemetry anomalies, analyzing link degradation, and advising on pointing corrections in real time.

---

## 🏗️ System Architecture

```text
               +---------------------------------------------+
               |  Tactical SatCom Intelligence (TSI) UI      |
               |  (React 19 + Tailwind + Motion + Canvas)    |
               +----------------------+----------------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
+--------v--------+          +--------v--------+          +--------v--------+
| Look Angle &    |          | NIST Post-      |          | DarkLink Mesh   |
| Link Budget     |          | Quantum Engine  |          | & Web Serial    |
| - ITU-R Rain    |          | - ML-DSA-65     |          | - LoRa SX1262   |
| - FSPL & Skew   |          | - ML-KEM-768    |          | - Meshtastic    |
| - Slant Range   |          | - Bit-packed    |          | - Hardware C2   |
+--------+--------+          +--------+--------+          +--------+--------+
         |                            |                            |
         +----------------------------+----------------------------+
                                      |
                         +------------v------------+
                         | Visual PQC Audit Trail  |
                         | - SHA-256 Payload Hash  |
                         | - Public Key FP (Hex)   |
                         | - Lattice Verification  |
                         | - Tamper Detection Demo |
                         +------------+------------+
                                      |
                         +------------v------------+
                         | Mission Debrief Engine  |
                         | - CSV (RFC 4180)        |
                         | - JSON Manifest Seal    |
                         | - Markdown Briefing     |
                         +-------------------------+
```

---

## 🛡️ Post-Quantum Cryptography (PQC) Engine

TSI incorporates NIST's finalized post-quantum standards to protect tactical telemetry and C2 links against the **Harvest Now, Decrypt Later (HNDL)** threat model:

| Algorithm Standard | NIST Specification | Security Category | Quantum Hardness | Primary Role in TSI |
|---|---|---|---|---|
| **ML-DSA-65** | NIST FIPS 204 (Dilithium) | Level 3 | 128+ bits | Telemetry frame signing, C2 override validation, canary traps |
| **ML-KEM-768** | NIST FIPS 203 (Kyber) | Level 3 | 128+ bits | Tactical session key exchange, mesh node authentication |
| **ML-KEM-1024** | NIST FIPS 203 (Kyber) | Level 5 | 256 bits | Strategic command uplink key encapsulation |

```typescript
import { PQCService } from './services/pqcService';
import { PqcAuditService } from './services/pqcAuditService';

// Generate NIST ML-DSA-65 keypair
const keypair = PQCService.generateKeypair();

// Sign tactical telemetry frame
const signature = PQCService.sign("CMD_LOCK: Eutelsat 10B | AZ: 142.4°", keypair._keysInstance);

// Verify signature against public key
const isValid = PQCService.verify("CMD_LOCK: Eutelsat 10B | AZ: 142.4°", signature, keypair.publicKey);
```

---

## 📊 PQC Signature Audit & Mission Debriefing

The audit engine tracks all cryptographic operations in a structured, local, and exportable ledger:

### Exporting Mission Debriefs

TSI provides three export formats accessible via the **Security Tools -> PQC Audit** tab:

1. **RFC 4180 CSV (`.csv`)**:
   - Columns include: `Record_ID`, `Timestamp_ISO`, `Timestamp_UTC`, `Action`, `Algorithm`, `Verification_Status`, `Verified_At`, `Operator`, `Mission_Context`, `Payload_Summary`, `Payload_Raw`, `Payload_SHA256_Hash`, `Public_Key_Fingerprint`, `Public_Key_Hex`, `Signature_Hex`, `Signature_Bytes`, and `Metadata_JSON`.
   - Supports exporting either the entire ledger or the currently active filtered search view.
2. **Cryptographic JSON Bundle (`.json`)**:
   - Machine-verifiable format containing a SHA-256 seal computed over the entire record manifest.
3. **Command Staff Markdown (`.md`)**:
   - Executive summary, chronological audit tables, cryptographic artifact breakdowns, and engineer attestations.

---

## 📡 Off-Grid Mesh & Hardware Integration

TSI connects to field communication devices without relying on central internet providers:

- **Web Serial API**: Direct connection to USB-to-UART bridge controllers (CP2102, CH340, FTDI).
- **Meshtastic / LoRa**: Compatible with SX1262 and SX1268 transceivers over 915 MHz (US) and 868 MHz (EU).
- **SDR Integration**: Compatible with RTL-SDR and HackRF One for passive RF spectrum intercept and carrier monitoring.

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or higher

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/baalbek/satexpert-tactical-satcom-intelligence.git
cd satexpert-tactical-satcom-intelligence

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY if using AI copilot features

# 4. Start the development server
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## 🔧 Environment Configuration

Copy `.env.example` to `.env`:

```bash
# Google Gemini API Key for tactical intelligence assistant
GEMINI_API_KEY=your_gemini_api_key_here

# Local dev server port
PORT=3000
```

---

## 📁 Directory Structure

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml       # Structured bug report template
│   │   └── feature_request.yml  # Feature proposal template
│   ├── workflows/
│   │   ├── ci.yml               # Automated CI test & build pipeline
│   │   └── release.yml          # GitHub release packaging workflow
│   └── PULL_REQUEST_TEMPLATE.md # PR guidelines and verification checklist
├── components/
│   ├── PqcAuditHistory.tsx      # Visual audit ledger, CSV/JSON/MD exports
│   ├── PqcKeyManager.tsx        # NIST Kyber ML-KEM key generator & testbench
│   ├── QuantumDefense.tsx       # Canary traps, Grover simulation, ML-DSA
│   ├── SecurityTools.tsx        # Central security suite & tab coordinator
│   ├── SiemAudit.tsx            # SIEM threat events & system sweep
│   ├── DarkLink.tsx             # Off-grid Web Serial LoRa mesh communicator
│   ├── LookAngleCard.tsx        # Azimuth, elevation & polarization calculator
│   ├── LinkBudgetCalculator.tsx # ITU-R rain fade & C/N0 link budget model
│   ├── TacticalMap.tsx          # Real-time satellite ground track & RF heatmap
│   ├── WarGamesSimulator.tsx    # EW jamming and carrier interference simulator
│   └── AITechnician.tsx         # Gemini-powered tactical satcom advisor
├── services/
│   ├── pqcAuditService.ts       # Audit store, verification, CSV/JSON debriefs
│   ├── pqcService.ts            # Wasm-backed ML-DSA & ML-KEM implementations
│   ├── audioService.ts          # Synthesized tactical voice audio cues
│   ├── geminiService.ts         # Google GenAI integration
│   └── satelliteService.ts      # Orbital mechanics & status simulations
├── .editorconfig                # Universal indentation and charset rules
├── .gitignore                   # Ignored files (dist, node_modules, .env)
├── .prettierrc                  # Consistent code formatting rules
├── index.html                   # HTML5 shell with PWA & OpenGraph tags
├── index.css                    # Base stylesheet & scrollbar resets
├── index.tsx                    # React application entry point
├── package.json                 # Project dependencies and release metadata
├── tsconfig.json                # Strict TypeScript configuration
└── vite.config.ts               # Vite build config with Wasm & chunk splitting
```

---

## 🧪 Scripts & Quality Assurance

```bash
# Start local development server (port 3000)
npm run dev

# Run TypeScript type check
npm run typecheck

# Run linter
npm run lint

# Compile production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🔒 Security & Threat Model

TSI is engineered under the assumption of an **adversary with access to cryptographically relevant quantum computers (CRQC)**:

1. **Harvest Now, Decrypt Later (HNDL)**: Standard RSA-2048 and ECC P-256 keys are vulnerable to retroactive decryption once scalable quantum machines exist. TSI eliminates this attack surface by employing NIST FIPS 203 (ML-KEM) and FIPS 204 (ML-DSA).
2. **Air-Gapped & Local First**: Cryptographic key generation, signature creation, and verification happen locally on the user's workstation. Private keys are never transmitted over the network.
3. **No Key UI Leakage**: Sensitive credentials use environment variables (`.env`) or client-side ephemeral memory buffers.

For vulnerability disclosures, please review [SECURITY.md](./SECURITY.md).

---

## 🤝 Contributing

Contributions to SatExpert Tactical SatCom Intelligence are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md).

```bash
# Create a feature branch
git checkout -b feature/tactical-enhancement

# Verify type safety and build
npm run typecheck
npm run build
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

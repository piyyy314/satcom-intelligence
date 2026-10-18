# Security Policy

## Supported Versions

| Version | Supported          | Security Maintenance Status |
| ------- | ------------------ | --------------------------- |
| 1.0.x   | :white_check_mark: | Active (Current)            |
| < 1.0.0 | :x:                | Deprecated                  |

---

## Cryptographic Architecture & Post-Quantum Assurance

Tactical SatCom Intelligence (TSI) implements post-quantum cryptographic primitives conforming to:
- **NIST FIPS 203**: Module-Lattice-Based Key-Encapsulation Mechanism Standard (ML-KEM, CRYSTALS-Kyber)
- **NIST FIPS 204**: Module-Lattice-Based Digital Signature Standard (ML-DSA, CRYSTALS-Dilithium)

### Threat Model & Defenses:
1. **Harvest Now, Decrypt Later (HNDL)**: Adversaries recording encrypted satellite transmissions today with intent to decrypt using future quantum computers (Shor's algorithm) cannot defeat lattice-based ML-KEM session encapsulation.
2. **Key Storage**: Private keys are generated in client memory and never transmitted to external APIs or remote servers.
3. **Audit Immutability**: All telemetry signatures are bound to public key fingerprints and SHA-256 digests. Any bit tampering is immediately surfaced as `TAMPER_DETECTED`.

---

## Reporting a Vulnerability

If you discover a security vulnerability or cryptographic flaw within this repository, please do **NOT** open a public issue.

Instead, please report the vulnerability privately by email to:
- **Security Contact**: baalbek.313@gmail.com

Please include:
1. Description of the vulnerability and attack vector.
2. Proof of Concept (PoC) or reproduction steps.
3. Impact assessment on satellite telemetry or PQC operations.

### Response Timeline
- **Initial Response**: Within 48 hours.
- **Triage & Assessment**: Within 5 business days.
- **Remediation & Patch Release**: Coordinated with reporter under responsible disclosure guidelines.

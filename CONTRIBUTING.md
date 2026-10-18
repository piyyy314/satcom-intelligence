# Contributing to SatExpert Tactical SatCom Intelligence (TSI)

Thank you for your interest in contributing to Tactical SatCom Intelligence! We welcome contributions from satellite engineers, cryptographers, radio operators, and software developers.

---

## Code of Conduct

All contributors are expected to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md). Please treat all members of the community with dignity and respect.

---

## Development Setup

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/<your-username>/satexpert-tactical-satcom-intelligence.git
   cd satexpert-tactical-satcom-intelligence
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Add your GEMINI_API_KEY if testing AI capabilities
   ```

4. **Run Local Dev Server**:
   ```bash
   npm run dev
   ```

---

## Guidelines for Contributions

### Cryptographic Security (PQC)
- Always adhere to official **NIST FIPS 203 (ML-KEM)** and **NIST FIPS 204 (ML-DSA)** parameters.
- Never write custom or unreviewed cryptographic primitives.
- Ensure private keys and sensitive session tokens remain in local, client-side memory or encrypted IndexedDB stores. Never transmit private keys or logs to remote telemetry endpoints.

### TypeScript & Code Quality
- Strict typing is enforced (`noImplicitAny`, strict null checks).
- Run `npm run typecheck` and `npm run lint` before committing.
- Avoid external dependencies unless strictly necessary for tactical RF, signal processing, or cryptographic operations.

### Git Workflow & Pull Requests
1. Branch naming conventions:
   - `feature/<name>` for new features
   - `fix/<issue-name>` for bug fixes
   - `security/<patch-name>` for security hardening
   - `docs/<subject>` for documentation updates
2. Submit PRs against the `main` branch.
3. Ensure the PR description details:
   - What problem is solved
   - How changes were tested (including cryptographic verification steps)
   - Relevant screenshots or terminal logs
4. Follow the checklist in our [Pull Request Template](./.github/PULL_REQUEST_TEMPLATE.md).

---

## Running Verification

Ensure your branch builds and passes all checks prior to opening a PR:

```bash
npm run typecheck
npm run build
```

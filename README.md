# FarmFund — Stellar Embedded Wallet, Circle USDC & Soroban Escrow Infrastructure

FarmFund integrates an embedded Stellar wallet, official Circle USDC settlement layer, and Soroban smart-contract escrow architecture across all five platform roles (**Farmers**, **Farm Workers**, **Individual Sponsors**, **Companies/Organisations**, and **Administrators**).

---

## 1. Architecture & Custody Model (Deliverables 1, 2 & 12)

- **Embedded Wallet Experience**: Every authenticated user receives a deterministic, unique Ed25519 Stellar public key (`G...`) directly inside FarmFund without installing Freighter, LOBSTR, or any external browser extension.
- **Managed Server Vault Custody**: Signing keys are generated via `@stellar/stellar-sdk` (`Keypair.random()`) on the backend (`server.ts`) and encrypted at rest using **AES-256-GCM** derived from `STELLAR_CUSTODY_MASTER_KEY`. Raw secret keys (`S...`) are **never** stored in Firestore, `localStorage`, `sessionStorage`, or returned to the client.
- **Organisation Multi-Representative Governance**: Company/Organisation wallets (`COMP01` / `Company` role) maintain an organisation-controlled vault with explicit authorised signatory records and role-based approval permissions—representatives never share raw private keys.
- **Restricted Administrator Oversight**: Administrators (`FAMAD01` / `Admin` role) can inspect wallet activation health, on-chain transaction hashes, Soroban escrow states, and audit logs, but are blocked by both backend checks and UI controls from initiating commercial transfers.

---

## 2. Official Circle USDC & Stellar Network Configuration (Deliverables 4, 8 & 13)

Copy `.env.example` to `.env` and configure the following variables:

| Variable | Description | Default / Testnet Value |
| --- | --- | --- |
| `VITE_STELLAR_NETWORK` | Active Stellar network (`TESTNET` or `PUBLIC`) | `TESTNET` |
| `VITE_STELLAR_HORIZON_URL` | Stellar Horizon REST endpoint | `https://horizon-testnet.stellar.org` |
| `VITE_STELLAR_SOROBAN_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `VITE_STELLAR_FRIENDBOT_URL` | Testnet Friendbot activation service | `https://friendbot.stellar.org` |
| `VITE_STELLAR_USDC_ISSUER_TESTNET` | Official Circle Testnet USDC Issuer | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |
| `VITE_STELLAR_USDC_ISSUER_MAINNET` | Official Circle Mainnet USDC Issuer | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |
| `VITE_SOROBAN_ESCROW_CONTRACT_ID` | Deployed Soroban Escrow Contract ID | `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` |
| `STELLAR_CUSTODY_MASTER_KEY` | Server-only AES-256-GCM master seed | Server secret |
| `DEV_TEMP_ACCOUNT_PASSWORD` | Server-only initial password for dev codes (`FAMAD01`, `FAMER01`, `SPON01`, `COMP01`) | Server secret |

---

## 3. Stellar Testnet Setup, Activation & Verification (Deliverable 9)

1. **Provisioning**: Upon login, `POST /api/stellar/wallet/provision` idempotently creates the user's Stellar public key (`G...`). Newly created wallets start with `0.00 USDC`, `0.00 XLM`, status `Activation Required`, and an empty transaction history.
2. **Account Activation & USDC Trustline**: Clicking **Activate Wallet & Enable Circle USDC** calls `POST /api/stellar/wallet/activate`, which:
   - Funds the Testnet account reserve via Stellar Friendbot (`https://friendbot.stellar.org/?addr=G...`).
   - Builds, signs, and submits a real `Operation.changeTrust` transaction for official Circle Testnet USDC (`GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`).
   - Verifies transaction finality against `https://horizon-testnet.stellar.org/transactions/{hash}` before marking the wallet `Active`.
3. **Payment Verification**: Outbound transfers (`POST /api/stellar/payment/send`) validate StrKey format, prevent self-transfers, enforce idempotency keys, submit to Horizon Testnet, and verify ledger inclusion before recording `Verified`.

---

## 4. Soroban Smart-Contract Escrow Deployment Guide (Deliverable 10)

The Rust Soroban contract is located in `/contracts/farmfund_escrow/src/lib.rs` and enforces strict separation between:
- **Sponsor-to-Farmer 30% Support Escrow** (`fund_support_escrow`, `submit_support_milestone`, `release_support_escrow`)
- **Farmer-to-Worker Direct Wage Escrow** (`fund_worker_wage_escrow`, `release_worker_wage`) with `sponsor_deduction_bps = 0` (0% sponsor deduction).

To compile and deploy to Stellar Testnet using the Stellar CLI:

```bash
cd contracts/farmfund_escrow
stellar contract build
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/farmfund_escrow.wasm \
  --source-account <DEPLOYER_SECRET_OR_ALIAS> \
  --network testnet
```

Set the resulting `C...` contract address in `VITE_SOROBAN_ESCROW_CONTRACT_ID`.

---

## 5. Switching from Stellar Testnet to Mainnet (Deliverable 14)

1. Set `VITE_STELLAR_NETWORK="PUBLIC"` and `VITE_STELLAR_HORIZON_URL="https://horizon.stellar.org"`.
2. The server automatically switches the official Circle USDC issuer to `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` and disables Friendbot in favour of sponsored reserve funding (`beginSponsoringFutureReserves`) or direct XLM activation.
3. Configure a licensed Nigerian SEP-24/SEP-6 anchor (`VITE_NGN_RAMP_PROVIDER_ENABLED="true"`) before enabling NGN bank deposits/withdrawals.

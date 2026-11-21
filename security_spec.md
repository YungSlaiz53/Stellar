# FarmFund Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict System Separation**: Sponsor funding agreements (`sponsorFundingAgreements`) enforce an explicit `sharePercentage == 30` and `shareType in ['30% Farm Produce Share', '30% Farm Funds Share']`, whereas Worker Payments (`workerPayments`) enforce `sponsorShareDeducted == 0`.
2. **Identity & Ownership**:
   - Only the creating farmer (`farmerId == request.auth.uid`) or sponsor (`hirerId == request.auth.uid`) can create `workerRequests`; only farmers can create `supportRequests`.
   - Only the relevant parties (`farmerId == request.auth.uid`, `sponsorId == request.auth.uid`, assigned supervisor, or `isAdmin()`) can read `sponsorFundingAgreements`.
   - Only the relevant parties (`farmerId == request.auth.uid`, `hirerId == request.auth.uid`, `workerId == request.auth.uid`, or `isAdmin()`) can read or update `workerApplications`, `workerAgreements`, and `workerPayments`.
   - Dedicated embedded Stellar USDC wallets (`userWallets`) and `walletTransactions` are enabled for `Worker`, `Farmer`, `Sponsor`, and `Supervisor` (strictly scoped to `userId == request.auth.uid`), while `Admin` remains read-only oversight.
3. **Immutable Audit Trail**: Once a `sponsorFundingAgreement` is accepted (`status == 'Active Agreement'` or `'Completed'`), core terms (`sharePercentage`, `shareType`, `sponsorContribution`, `calculationMethod`, `farmerId`, `sponsorId`) cannot be silently altered.
4. **Payment Confirmation & Anti-Absconding Acceptance Fee Guard**:
   - A `workerPayment` cannot be marked `'Confirmed Paid'` unless `workConfirmedByFarmer == true` and `paymentConfirmedByWorker == true`.
   - `acceptanceFees` enforce USDC commitment bonds for hired Workers and funded Farmers: once finalized (`Refunded` or `Forfeited (Absconded)`), no double-resolution is permitted; only `obligorId` can lock, and only `beneficiaryId` or `Admin` can trigger absconding forfeiture with a documented reason.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on SupportRequest**: Adding `isApprovedBySystem: true` -> Rejected by `.keys().hasOnly(...)`.
2. **Identity Spoofing on WorkerRequest**: Setting `farmerId: "another_farmer_uid"` -> Rejected by `data.farmerId == request.auth.uid`.
3. **Invalid Share Percentage**: Setting `sharePercentage: 50` in `sponsorFundingAgreements` -> Rejected by `data.sharePercentage in [0, 30]`.
4. **Worker Wage Deduction Violation**: Setting `sponsorShareDeducted: 3000` in `workerPayments` -> Rejected by `data.sponsorShareDeducted == 0`.
5. **Unverified Email Admin Spoof**: Token with `email == 'blessedogle52@gmail.com'` and `email_verified == false` -> Rejected by `request.auth.token.email_verified == true`.
6. **ID Poisoning**: 500-character junk document ID -> Rejected by `isValidId(id)`.
7. **Denial of Wallet String Overflow**: 10,000-character `description` in `supportRequests` -> Rejected by `data.description.size() <= 2000`.
8. **Silent Agreement Term Alteration**: Updating `calculationMethod` after `farmerAccepted == true && sponsorAccepted == true` -> Rejected by immutable field checks on update.
9. **Premature Payment Completion**: Setting `status: 'Confirmed Paid'` while `paymentConfirmedByWorker == false` -> Rejected by payment confirmation invariant.
10. **PII Leak on WorkerPayments**: Authenticated third-party user attempting `get` or `list` on `workerPayments` where they are neither `farmerId` nor `workerId` -> Rejected by owner/party gate.
11. **Terminal State Reversal**: Updating a `Refunded` or `Forfeited (Absconded)` `acceptanceFees` record -> Rejected by terminal state lock.
12. **Array Overflow on Photographs**: Submitting 25 URLs in `photographs` -> Rejected by `data.photographs.size() <= 10`.


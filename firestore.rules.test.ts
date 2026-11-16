import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesText = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

test('Phase 0-6 Hardened Firestore Rules Verification (Dirty Dozen Guards + Stellar Wallet Security)', () => {
  // 1. Global Safety Net
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);

  // 2. Email verification enforced for writes and admin
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);

  // 3. Sponsor 30% share strictly enforced in sponsorFundingAgreements and supportFundingAgreements
  assert.match(rulesText, /data\.sharePercentage == 30/);
  assert.match(rulesText, /data\.agreedSharePercentage == 30/);
  assert.match(rulesText, /'30% Farm Produce Share', '30% Farm Funds Share'/);

  // 4. Worker payments strictly enforce 0% sponsor deduction
  assert.match(rulesText, /data\.sponsorShareDeducted == 0/);

  // 5. Worker payment completion requires both farmer work confirmation and worker payment confirmation
  assert.match(
    rulesText,
    /data\.status != 'Confirmed Paid' \|\| \(data\.workConfirmedByFarmer == true && data\.paymentConfirmedByWorker == true\)/
  );

  // 6. Stellar public key regex guard and no fake Verified transactions from client
  assert.match(rulesText, /addr\.matches\('\^G\[A-Z2-7\]\{55\}\$'\)/);
  assert.match(rulesText, /incoming\(\)\.status == 'Pending Verification'/);

  // 7. All 16 collections (10 base + 6 Stellar wallet/escrow collections) are covered
  const requiredCollections = [
    'supportRequests',
    'sponsorFundingAgreements',
    'workerProfiles',
    'workerRequests',
    'workerApplications',
    'workerAgreements',
    'workerPayments',
    'messages',
    'disputes',
    'admins',
    'userWallets',
    'walletTransactions',
    'supportFundingAgreements',
    'workerPaymentAgreements',
    'walletActivationRecords',
    'walletAuditLogs',
  ];
  for (const col of requiredCollections) {
    assert.ok(rulesText.includes(`match /${col}/`), `Missing collection match block for ${col}`);
  }
});

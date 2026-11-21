import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesText = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

test('Phase 0-6 Hardened Firestore Rules Verification (Four-Role, Supervision, Verification, and Stellar Wallet Security)', () => {
  // 1. Global Default-Deny Safety Net
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);

  // 2. Email verification enforced for writes and admin
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);

  // 3. Users cannot self-assign Admin role on creation or change roles on update, and cannot self-verify
  assert.match(rulesText, /incoming\(\)\.role in \['Worker', 'Farmer', 'Supervisor', 'Sponsor'\]/);
  assert.match(rulesText, /incoming\(\)\.role == existing\(\)\.role/);
  assert.match(rulesText, /incoming\(\)\.verificationStatus == 'Pending Verification'/);

  // 4. Workers forbidden from publishing workerRequests; Hirer only Farmer/Sponsor
  assert.match(rulesText, /!userHasRole\('Worker'\)/);
  assert.match(rulesText, /data\.hirerRole in \['Farmer', 'Sponsor'\]/);

  // 5. Explicit Support & Flexible Share Models (0% or 30% produce/funds)
  assert.match(rulesText, /'None \(Standard Support\)', '30% Farm Produce Share', '30% Farm Funds Share'/);

  // 6. Worker payments strictly enforce 0% sponsor deduction and dual confirmation
  assert.match(rulesText, /data\.sponsorShareDeducted == 0/);
  assert.match(
    rulesText,
    /data\.status != 'Confirmed Paid' \|\| \(data\.workConfirmedByFarmer == true && data\.paymentConfirmedByWorker == true\)/
  );

  // 7. Supervision scoped strictly to invitedSupervisorId / assigned supervisorId; Supervisors own active wallets while Admin is read-only
  assert.match(rulesText, /existing\(\)\.invitedSupervisorId == request\.auth\.uid/);
  assert.match(rulesText, /existing\(\)\.supervisorId == request\.auth\.uid/);
  assert.match(rulesText, /incoming\(\)\.role in \['Worker', 'Farmer', 'Sponsor', 'Supervisor'\]/);
  assert.match(rulesText, /!userHasRole\('Admin'\)/);

  // 8. Stellar public key regex guard, no fake Verified transactions from client, and Acceptance Fee terminal lock
  assert.match(rulesText, /addr\.matches\('\^G\[A-Z2-7\]\{55\}\$'\)/);
  assert.match(rulesText, /incoming\(\)\.status == 'Pending Verification'/);
  assert.match(rulesText, /!\(existing\(\)\.status in \['Refunded', 'Forfeited \(Absconded\)'\]\)/);

  // 9. Every collection in blueprint is covered by an explicit match block
  const requiredCollections = [
    'users',
    'workerProfiles',
    'farmerProfiles',
    'supervisorProfiles',
    'sponsorProfiles',
    'organisations',
    'supportRequests',
    'assistanceRequests',
    'sponsorOffers',
    'supportAgreements',
    'sponsorFundingAgreements',
    'workerRequests',
    'workerApplications',
    'workerAgreements',
    'workerPayments',
    'supervisionRequests',
    'supervisionAssignments',
    'supervisionReports',
    'conversations',
    'messages',
    'notifications',
    'verificationApplications',
    'supportUpdates',
    'reviews',
    'disputes',
    'admins',
    'adminAuditLogs',
    'platformSettings',
    'userWallets',
    'walletTransactions',
    'supportFundingAgreements',
    'workerPaymentAgreements',
    'walletActivationRecords',
    'walletAuditLogs',
    'acceptanceFees',
  ];
  for (const col of requiredCollections) {
    assert.ok(rulesText.includes(`match /${col}/`), `Missing collection match block for ${col}`);
  }
});

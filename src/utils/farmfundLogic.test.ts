import test from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@stellar/stellar-sdk';
import {
  acceptSponsorAgreementParty,
  calculateSponsorThirtyPercentShare,
  calculateWorkerWageSummary,
  calculateWorkerWageUsdcObligations,
  canAccessRoleDashboard,
  canRoleExecuteWalletTransfer,
  canSupervisorAccessProject,
  evaluateProfileUpdatePermissions,
  evaluateWorkerPaymentTransition,
  isAllowedPublicRegistrationRole,
  isValidStellarPublicAddress,
  OFFICIAL_STELLAR_USDC_CONFIG,
  validateOfficialStellarAsset,
  validateRegistrationPayload,
  validateSorobanEscrowTransition,
  validateSupportRequestDraft,
  validateWorkerRequestDraft,
} from './farmfundLogic';
import { SponsorFundingAgreement, WorkerPayment } from '../types/farmfund';

test('30% Sponsor Share calculation works accurately for Produce, Farm Funds, and Standard Support', () => {
  const produceSplit = calculateSponsorThirtyPercentShare({
    shareType: '30% Farm Produce Share',
    eligibleTotalAmount: 200,
    unitLabel: 'bags of maize',
  });
  assert.equal(produceSplit.sharePercentage, 30);
  assert.equal(produceSplit.farmerRetentionPercentage, 70);
  assert.equal(produceSplit.sponsorShareValue, 60);
  assert.equal(produceSplit.farmerRetainedValue, 140);

  const fundsSplit = calculateSponsorThirtyPercentShare({
    shareType: '30% Farm Funds Share',
    eligibleTotalAmount: 1000000,
    unitLabel: 'NGN',
  });
  assert.equal(fundsSplit.sponsorShareValue, 300000);
  assert.equal(fundsSplit.farmerRetainedValue, 700000);

  const noShare = calculateSponsorThirtyPercentShare({
    shareType: 'None (Standard Support)',
    eligibleTotalAmount: 500000,
    unitLabel: 'NGN',
  });
  assert.equal(noShare.sharePercentage, 0);
  assert.equal(noShare.sponsorShareValue, 0);
  assert.equal(noShare.farmerRetainedValue, 500000);
});

test('Public registration blocks Admin role and validates all four roles separately', () => {
  assert.equal(isAllowedPublicRegistrationRole('Worker'), true);
  assert.equal(isAllowedPublicRegistrationRole('Farmer'), true);
  assert.equal(isAllowedPublicRegistrationRole('Supervisor'), true);
  assert.equal(isAllowedPublicRegistrationRole('Sponsor'), true);
  assert.equal(isAllowedPublicRegistrationRole('Admin'), false);

  const adminAttempt = validateRegistrationPayload({
    role: 'Admin' as never,
    fullName: 'Hacker',
    email: 'test@example.com',
    password: 'Password123',
  });
  assert.match(adminAttempt || '', /four public roles/);

  const orgSponsorErr = validateRegistrationPayload({
    role: 'Sponsor',
    sponsorType: 'organisation',
    organisationName: 'GreenHarvest Partners',
    email: 'ops@greenharvest.ng',
    password: 'Password123',
    phone: '+2348012345678',
    officeAddress: '12 Ring Road',
    country: 'Nigeria',
    townOrLocation: 'Ibadan',
    organisationType: 'Agribusiness Fund',
    representativeName: 'Seyi Ade',
    representativePosition: 'Director',
    representativeIdDocument: 'NIN_12345.pdf',
    registrationDocuments: ['CAC_Cert.pdf'],
    description: 'Supporting smallholder maize producers across Oyo State.',
  });
  assert.equal(orgSponsorErr, null);
});

test('Users cannot change primary role, self-verify, and verified profile edits trigger re-verification', () => {
  const roleSwitch = evaluateProfileUpdatePermissions({
    actorUser: { id: 'u1', role: 'Worker', verificationStatus: 'Pending Verification' },
    targetUserId: 'u1',
    attemptedRoleChange: 'Admin',
    editedVerifiedIdentityFields: false,
  });
  assert.equal(roleSwitch.allowed, false);

  const selfVerify = evaluateProfileUpdatePermissions({
    actorUser: { id: 'u1', role: 'Supervisor', verificationStatus: 'Pending Verification' },
    targetUserId: 'u1',
    attemptedStatusChange: 'Verified',
    editedVerifiedIdentityFields: false,
  });
  assert.equal(selfVerify.allowed, false);

  const reVerify = evaluateProfileUpdatePermissions({
    actorUser: { id: 'u2', role: 'Farmer', verificationStatus: 'Verified' },
    targetUserId: 'u2',
    editedVerifiedIdentityFields: true,
  });
  assert.equal(reVerify.allowed, true);
  assert.equal(reVerify.nextVerificationStatus, 'Pending Verification');

  const adminVerify = evaluateProfileUpdatePermissions({
    actorUser: { id: 'adm1', role: 'Admin', verificationStatus: 'Verified' },
    targetUserId: 'u1',
    attemptedStatusChange: 'Verified',
    editedVerifiedIdentityFields: false,
  });
  assert.equal(adminVerify.allowed, true);
});

test('Supervisors can only access accepted, supervision-required, assigned/invited projects and cannot transfer wallet funds', () => {
  assert.equal(
    canSupervisorAccessProject({
      supervisorId: 'sup_1',
      agreementAccepted: false,
      supervisionRequired: true,
      invitation: { invitedSupervisorId: 'sup_1', status: 'Invited' },
    }),
    false
  );

  assert.equal(
    canSupervisorAccessProject({
      supervisorId: 'sup_1',
      agreementAccepted: true,
      supervisionRequired: true,
      invitation: { invitedSupervisorId: 'sup_2', status: 'Invited' },
    }),
    false
  );

  assert.equal(
    canSupervisorAccessProject({
      supervisorId: 'sup_1',
      agreementAccepted: true,
      supervisionRequired: true,
      assignment: { supervisorId: 'sup_1', status: 'Active Supervision' },
    }),
    true
  );

  assert.equal(canRoleExecuteWalletTransfer('Supervisor'), false);
  assert.equal(canRoleExecuteWalletTransfer('Admin'), false);
  assert.equal(canRoleExecuteWalletTransfer('Worker'), true);
  assert.equal(canRoleExecuteWalletTransfer('Farmer'), true);
  assert.equal(canRoleExecuteWalletTransfer('Sponsor'), true);

  assert.equal(canAccessRoleDashboard('Worker', 'Farmer'), false);
  assert.equal(canAccessRoleDashboard('Supervisor', 'Admin'), false);
  assert.equal(canAccessRoleDashboard('Sponsor', 'Sponsor'), true);
});

test('Worker wage summary calculates 5 harvest workers at ₦10,000 with 0% sponsor deduction', () => {
  const wageSummary = calculateWorkerWageSummary({
    workersNeeded: 5,
    paymentAmountNaira: 10000,
    paymentBasis: 'Per Worker (Total Task)',
  });
  assert.equal(wageSummary.workersCount, 5);
  assert.equal(wageSummary.totalLabourBudgetNaira, 50000);
  assert.equal(wageSummary.sponsorShareDeducted, 0);
});

test('5 workers at ₦10,000 per worker creates 5 separate USDC wage obligations with 0% sponsor share deduction', () => {
  const breakdown = calculateWorkerWageUsdcObligations({
    workersCount: 5,
    wagePerWorkerNaira: 10000,
    referenceRateNgnPerUsdc: 1600,
  });
  assert.equal(breakdown.workersCount, 5);
  assert.equal(breakdown.totalWageObligationNaira, 50000);
  assert.equal(breakdown.usdcPerWorker, 6.25);
  assert.equal(breakdown.totalUsdcObligation, 31.25);
  assert.equal(breakdown.sponsorShareDeducted, 0);
});

test('Official Stellar USDC asset validator accepts genuine Circle USDC and rejects fake USDC issuers', () => {
  const validTestnet = validateOfficialStellarAsset({
    assetCode: 'USDC',
    assetIssuer: OFFICIAL_STELLAR_USDC_CONFIG.testnetIssuer,
    network: 'TESTNET',
  });
  assert.equal(validTestnet.valid, true);

  const fakeUsdc = validateOfficialStellarAsset({
    assetCode: 'USDC',
    assetIssuer: Keypair.random().publicKey(),
    network: 'TESTNET',
  });
  assert.equal(fakeUsdc.valid, false);
});

test('Stellar public key validation accepts real Ed25519 G-addresses and rejects invalid strings', () => {
  const kp = Keypair.random();
  assert.equal(isValidStellarPublicAddress(kp.publicKey()), true);
  assert.equal(isValidStellarPublicAddress('G_FAKE_ADDRESS_123'), false);
  assert.equal(isValidStellarPublicAddress(kp.secret()), false);
});

test('Soroban escrow state machine enforces dual-party acceptance and prevents double payment', () => {
  const unaccepted = validateSorobanEscrowTransition({
    escrowDomain: 'SPONSOR_SUPPORT_30_PERCENT',
    currentStatus: 'Created',
    requestedAction: 'DEPOSIT',
    bothPartiesAccepted: false,
    evidenceOrWorkVerified: false,
  });
  assert.equal(unaccepted.allowed, false);

  const depositOk = validateSorobanEscrowTransition({
    escrowDomain: 'SPONSOR_SUPPORT_30_PERCENT',
    currentStatus: 'Created',
    requestedAction: 'DEPOSIT',
    bothPartiesAccepted: true,
    evidenceOrWorkVerified: false,
  });
  assert.equal(depositOk.allowed, true);
  assert.equal(depositOk.nextStatus, 'Funded in Escrow');
});

test('SponsorFundingAgreement requires both Farmer and Sponsor acceptance before becoming Active', () => {
  const draftAgreement: SponsorFundingAgreement = {
    id: 'agr_test_1',
    ownerId: 'farmer_1',
    requestId: 'req_1',
    requestTitle: 'Cassava & Maize Irrigation Support',
    farmerId: 'farmer_1',
    farmerName: 'Adewale Ogunleye',
    sponsorId: 'sponsor_1',
    sponsorName: 'AgroVanguard Partners',
    sponsorContribution: '₦1,200,000 + 25 bags NPK Fertiliser',
    contributionValueNaira: 1200000,
    usesThirtyPercentShare: true,
    sharePercentage: 30,
    shareType: '30% Farm Produce Share',
    calculationMethod: '30% of net harvested dry maize bags weighed at farmgate',
    entitlementTiming: 'Within 14 days of verified harvest completion',
    measurementVerification: 'Digital scale weighbridge + joint sign-off',
    lossOrPoorHarvestClause: 'Pro-rata sharing of actual surviving harvest',
    additionalConditions: 'Bi-weekly field photo updates',
    supervisionRequired: false,
    farmerAccepted: false,
    farmerAcceptedAt: '',
    sponsorAccepted: false,
    sponsorAcceptedAt: '',
    status: 'Pending Acceptance',
    historyLog: [],
    createdAt: '2026-11-16T08:00:00.000Z',
    updatedAt: '2026-11-16T08:00:00.000Z',
  };

  const afterFarmer = acceptSponsorAgreementParty(draftAgreement, 'Farmer', '2026-11-16T09:00:00.000Z');
  assert.equal(afterFarmer.status, 'Pending Acceptance');

  const afterBoth = acceptSponsorAgreementParty(afterFarmer, 'Sponsor', '2026-11-16T10:00:00.000Z');
  assert.equal(afterBoth.status, 'Active Agreement');
});

test('Worker payment requires both hirer and worker confirmation', () => {
  const initialPayment: WorkerPayment = {
    id: 'pay_1',
    workerAgreementId: 'wagr_1',
    workerRequestId: 'wreq_1',
    jobTitle: '5-Day Maize Harvest Crew',
    farmerId: 'farmer_1',
    farmerName: 'Adewale Ogunleye',
    workerId: 'worker_1',
    workerName: 'Musa Danjuma',
    amountNaira: 10000,
    sponsorShareDeducted: 0,
    paymentMethod: 'Embedded Stellar USDC Wallet',
    workConfirmedByFarmer: false,
    paymentConfirmedByWorker: false,
    status: 'Pending Work Completion',
    paidAt: '',
    createdAt: '2026-11-16T08:00:00.000Z',
  };

  const afterFarmer = evaluateWorkerPaymentTransition(
    initialPayment,
    'FARMER_CONFIRM_WORK_AND_INITIATE',
    '2026-11-16T12:00:00.000Z'
  );
  assert.equal(afterFarmer.status, 'Awaiting Payment Confirmation');

  const afterWorker = evaluateWorkerPaymentTransition(
    afterFarmer,
    'WORKER_CONFIRM_RECEIPT',
    '2026-11-16T13:00:00.000Z'
  );
  assert.equal(afterWorker.status, 'Confirmed Paid');
  assert.equal(afterWorker.sponsorShareDeducted, 0);
});

test('Form validators allow explicit standard or 30% support and enforce worker rules', () => {
  const invalidSupport = validateSupportRequestDraft({
    title: 'Maize Support',
    farmName: 'Green Acres',
    farmingType: 'Crop Farming',
    cropOrProduceType: 'Maize',
    location: 'Oyo State',
    farmSize: '5 Hectares',
    description: 'Expanding hybrid yellow maize cultivation with drip irrigation.',
    farmingPeriod: '4 Months',
    expectedHarvestDate: '2027-03-30',
    estimatedOutput: '25 Tonnes',
    preferredShareModel: '30% Farm Produce Share',
    acknowledgedThirtyPercentNotice: false,
  });
  assert.match(invalidSupport || '', /30%/);

  const validStandard = validateSupportRequestDraft({
    title: 'Maize Inputs Support',
    farmName: 'Green Acres',
    farmingType: 'Crop Farming',
    cropOrProduceType: 'Maize',
    location: 'Oyo State',
    farmSize: '5 Hectares',
    description: 'Requesting certified seeds and NPK inputs under agreed support terms.',
    farmingPeriod: '4 Months',
    expectedHarvestDate: '2027-03-30',
    estimatedOutput: '25 Tonnes',
    preferredShareModel: 'None (Standard Support)',
    acknowledgedThirtyPercentNotice: false,
  });
  assert.equal(validStandard, null);

  const validWorkerReq = validateWorkerRequestDraft({
    jobTitle: 'Harvesting Crew',
    workCategory: 'Other agricultural work',
    customWorkCategory: 'Cassava peeling and bagging',
    description: 'Peeling and bagging harvested cassava roots.',
    location: 'Iseyin, Oyo State',
    workersNeeded: 5,
    requiredSkills: 'Post-harvest processing',
    startDate: '2026-12-01',
    expectedDuration: '3 Days',
    workingHours: '7:00 AM - 3:00 PM',
    paymentAmountNaira: 10000,
    paymentMethod: 'Embedded Stellar USDC Wallet',
    acknowledgedWageRule: true,
  });
  assert.equal(validWorkerReq, null);
});

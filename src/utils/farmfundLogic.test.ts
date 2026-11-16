import test from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@stellar/stellar-sdk';
import {
  acceptSponsorAgreementParty,
  calculateSponsorThirtyPercentShare,
  calculateWorkerWageSummary,
  calculateWorkerWageUsdcObligations,
  evaluateWorkerPaymentTransition,
  isValidStellarPublicAddress,
  OFFICIAL_STELLAR_USDC_CONFIG,
  validateOfficialStellarAsset,
  validateSorobanEscrowTransition,
  validateSupportRequestDraft,
  validateWorkerRequestDraft,
} from './farmfundLogic';
import { SponsorFundingAgreement, WorkerPayment } from '../types/farmfund';

test('30% Sponsor Share calculation works accurately for Produce and Farm Funds', () => {
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
  assert.equal(breakdown.individualWorkerObligations.length, 5);
  for (const item of breakdown.individualWorkerObligations) {
    assert.equal(item.amountNaira, 10000);
    assert.equal(item.amountUsdc, 6.25);
    assert.equal(item.sponsorShareDeducted, 0);
  }
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
  assert.match(fakeUsdc.reason || '', /Rejected unverified or fake USDC issuer/);
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

  const doubleRelease = validateSorobanEscrowTransition({
    escrowDomain: 'SPONSOR_SUPPORT_30_PERCENT',
    currentStatus: 'Released to Farmer',
    requestedAction: 'RELEASE',
    bothPartiesAccepted: true,
    evidenceOrWorkVerified: true,
  });
  assert.equal(doubleRelease.allowed, false);
});

test('SponsorFundingAgreement requires both Farmer and Sponsor acceptance before becoming Active', () => {
  const draftAgreement: SponsorFundingAgreement = {
    id: 'agr_test_1',
    requestId: 'req_1',
    requestTitle: 'Cassava & Maize Irrigation Support',
    farmerId: 'farmer_1',
    farmerName: 'Adewale Ogunleye',
    sponsorId: 'sponsor_1',
    sponsorName: 'AgroVanguard Partners',
    sponsorContribution: '₦1,200,000 + 25 bags NPK Fertiliser',
    contributionValueNaira: 1200000,
    sharePercentage: 30,
    shareType: '30% Farm Produce Share',
    calculationMethod: '30% of net harvested dry maize bags weighed at farmgate',
    entitlementTiming: 'Within 14 days of verified harvest completion',
    measurementVerification: 'Digital scale weighbridge + joint sign-off',
    lossOrPoorHarvestClause: 'Pro-rata sharing of actual surviving harvest; no debt penalty for natural drought/flood',
    additionalConditions: 'Bi-weekly field photo updates',
    farmerAccepted: false,
    farmerAcceptedAt: '',
    sponsorAccepted: false,
    sponsorAcceptedAt: '',
    status: 'Pending Acceptance',
    historyLog: [],
    createdAt: '2026-11-16T08:00:00.000Z',
  };

  const afterFarmer = acceptSponsorAgreementParty(draftAgreement, 'Farmer', '2026-11-16T09:00:00.000Z');
  assert.equal(afterFarmer.farmerAccepted, true);
  assert.equal(afterFarmer.sponsorAccepted, false);
  assert.equal(afterFarmer.status, 'Pending Acceptance');

  const afterBoth = acceptSponsorAgreementParty(afterFarmer, 'Sponsor', '2026-11-16T10:00:00.000Z');
  assert.equal(afterBoth.farmerAccepted, true);
  assert.equal(afterBoth.sponsorAccepted, true);
  assert.equal(afterBoth.status, 'Active Agreement');
});

test('Worker payment never marks Confirmed Paid until both farmer and worker confirm', () => {
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
    paymentMethod: 'Bank Transfer (NIP)',
    workConfirmedByFarmer: false,
    paymentConfirmedByWorker: false,
    status: 'Pending Work Completion',
    paidAt: '',
    createdAt: '2026-11-16T08:00:00.000Z',
  };

  const afterFarmerInitiates = evaluateWorkerPaymentTransition(
    initialPayment,
    'FARMER_CONFIRM_WORK_AND_INITIATE',
    '2026-11-16T12:00:00.000Z'
  );
  assert.equal(afterFarmerInitiates.status, 'Awaiting Payment Confirmation');
  assert.equal(afterFarmerInitiates.sponsorShareDeducted, 0);

  const afterWorkerConfirms = evaluateWorkerPaymentTransition(
    afterFarmerInitiates,
    'WORKER_CONFIRM_RECEIPT',
    '2026-11-16T13:00:00.000Z'
  );
  assert.equal(afterWorkerConfirms.status, 'Confirmed Paid');
  assert.equal(afterWorkerConfirms.paidAt, '2026-11-16T13:00:00.000Z');
  assert.equal(afterWorkerConfirms.sponsorShareDeducted, 0);
});

test('Form validators enforce 30% sponsor notice and worker wage rule acknowledgment', () => {
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
  assert.match(invalidSupport || '', /acknowledge the Important Sponsor Agreement/);

  const validWorkerReq = validateWorkerRequestDraft({
    jobTitle: 'Harvesting Crew',
    workCategory: 'Harvesting',
    description: 'Harvesting 5 hectares of ripe maize cobs.',
    location: 'Iseyin, Oyo State',
    workersNeeded: 5,
    requiredSkills: 'Manual harvesting experience',
    startDate: '2026-12-01',
    expectedDuration: '3 Days',
    workingHours: '7:00 AM - 3:00 PM',
    paymentAmountNaira: 10000,
    paymentMethod: 'Direct Bank Transfer',
    acknowledgedWageRule: true,
  });
  assert.equal(validWorkerReq, null);
});

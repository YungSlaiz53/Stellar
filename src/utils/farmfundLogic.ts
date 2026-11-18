import { StrKey } from '@stellar/stellar-sdk';
import {
  PlatformUser,
  ProfileVerificationStatus,
  RegistrationPayload,
  ShareArrangementType,
  SponsorFundingAgreement,
  StellarNetworkType,
  SupervisionAssignment,
  SupervisionRequest,
  SupportFundingAgreementRecord,
  SupportRequest,
  UserRole,
  WorkerPayment,
  WorkerPaymentAgreementRecord,
  WorkerPaymentBasis,
  WorkerRequest,
  WorkerPaymentStatus,
} from '../types/farmfund';

// ============================================================================
// OFFICIAL CIRCLE USDC & STELLAR ASSET CONFIGURATION
// ============================================================================

export const OFFICIAL_STELLAR_USDC_CONFIG = {
  assetCode: 'USDC' as const,
  testnetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  mainnetIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  sorobanSupportEscrowContractId:
    'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  sorobanWorkerEscrowContractId:
    'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT',
} as const;

export const OFFICIAL_USDC_ISSUER_TESTNET = OFFICIAL_STELLAR_USDC_CONFIG.testnetIssuer;

export function isValidStellarPublicAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return StrKey.isValidEd25519PublicKey(address.trim());
}

export function validateOfficialStellarAsset(params: {
  assetCode: string;
  assetIssuer: string;
  network: StellarNetworkType;
}): { valid: boolean; reason?: string } {
  const code = params.assetCode.trim().toUpperCase();
  const issuer = params.assetIssuer.trim();

  if (code === 'XLM') {
    if (issuer && issuer !== 'native') {
      return {
        valid: false,
        reason: 'Native XLM must not specify a custom asset issuer.',
      };
    }
    return { valid: true };
  }

  if (code !== OFFICIAL_STELLAR_USDC_CONFIG.assetCode) {
    return {
      valid: false,
      reason: `Unsupported asset "${code}". FarmFund only supports official Circle USDC (and native XLM for network reserves/fees).`,
    };
  }

  const expectedIssuer =
    params.network === 'PUBLIC'
      ? OFFICIAL_STELLAR_USDC_CONFIG.mainnetIssuer
      : OFFICIAL_STELLAR_USDC_CONFIG.testnetIssuer;

  if (issuer !== expectedIssuer) {
    return {
      valid: false,
      reason: `Rejected unverified or fake USDC issuer "${issuer}". Expected official Circle ${params.network} USDC issuer (${expectedIssuer}).`,
    };
  }

  return { valid: true };
}

// ============================================================================
// FOUR-ROLE REGISTRATION & ROLE INTEGRITY GUARDS (SECTIONS 2, 10, 11)
// ============================================================================

export const PUBLIC_REGISTRATION_ROLES = ['Worker', 'Farmer', 'Supervisor', 'Sponsor'] as const;

export function isAllowedPublicRegistrationRole(role: string): boolean {
  return (PUBLIC_REGISTRATION_ROLES as readonly string[]).includes(role);
}

export function validateRegistrationPayload(payload: Partial<RegistrationPayload>): string | null {
  if (!payload.role || !isAllowedPublicRegistrationRole(payload.role)) {
    return 'Please select one of the four public roles: Worker, Farmer, Supervisor, or Sponsor.';
  }

  if (payload.role === 'Sponsor' && payload.sponsorType === 'organisation') {
    if (!payload.organisationName?.trim()) return 'Organisation or company name is required.';
    if (!payload.email?.trim() || !payload.email.includes('@')) {
      return 'A valid official email address is required.';
    }
    if (!payload.password || payload.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (!payload.phone?.trim()) return 'Phone number is required.';
    if (!payload.officeAddress?.trim()) return 'Office address is required.';
    if (!payload.country?.trim() || !payload.townOrLocation?.trim()) {
      return 'Country and location are required.';
    }
    if (!payload.organisationType?.trim()) return 'Organisation type is required.';
    if (!payload.representativeName?.trim()) return "Representative's full name is required.";
    if (!payload.representativePosition?.trim()) return "Representative's position is required.";
    if (!payload.representativeIdDocument?.trim()) {
      return "Representative's government identification document reference is required.";
    }
    if (!payload.registrationDocuments || payload.registrationDocuments.length === 0) {
      return 'Organisation registration document reference is required.';
    }
    if (!payload.description?.trim()) return 'Organisation description is required.';
    return null;
  }

  if (!payload.fullName?.trim()) return 'Full name is required.';
  if (!payload.email?.trim() || !payload.email.includes('@')) {
    return 'A valid email address is required.';
  }
  if (!payload.password || payload.password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!payload.phone?.trim()) return 'Phone number with country code is required.';
  if (!payload.country?.trim()) return 'Country is required.';
  if (!payload.state?.trim()) return 'State is required.';
  if (!payload.lga?.trim()) return 'Local government area (LGA) is required.';
  if (!payload.townOrLocation?.trim()) return 'Town or residential/farm location is required.';
  if (!payload.governmentIdDocument?.trim()) {
    return 'A government-issued ID document reference is required for verification.';
  }

  if (payload.role === 'Worker') {
    if (!payload.skills || payload.skills.length === 0) {
      return 'Please list at least one agricultural skill.';
    }
    if (!payload.availableWorkTypes || payload.availableWorkTypes.length === 0) {
      return 'Select at least one type of farm work you can perform.';
    }
    if (!payload.expectedWageNaira || Number(payload.expectedWageNaira) <= 0) {
      return 'Expected wage preference must be greater than ₦0.';
    }
    if (!payload.availability?.trim()) return 'Please specify your availability.';
    if (!payload.bio?.trim()) return 'Please provide a short personal description.';
  }

  if (payload.role === 'Farmer') {
    if (!payload.farmName?.trim()) return 'Farm name is required.';
    if (!payload.farmLocation?.trim()) return 'Farm location is required.';
    if (!payload.farmingType?.trim()) return 'Farming type is required.';
    if (!payload.cropsOrLivestock?.trim()) return 'Crops or livestock details are required.';
    if (!payload.farmSize?.trim()) return 'Farm size is required.';
    if (!payload.yearsOfExperience?.trim()) return 'Years of farming experience is required.';
    if (!payload.farmDescription?.trim()) return 'Farm description is required.';
  }

  if (payload.role === 'Supervisor') {
    if (!payload.professionalQualifications?.trim()) {
      return 'Professional qualifications are required.';
    }
    if (!payload.agriculturalExperience?.trim()) {
      return 'Agricultural experience is required.';
    }
    if (!payload.specialisations || payload.specialisations.length === 0) {
      return 'Select at least one supervision area of specialisation.';
    }
    if (!payload.previousSupervisionExperience?.trim()) {
      return 'Previous supervision experience is required.';
    }
    if (!payload.bio?.trim()) return 'Short professional description is required.';
    if (!payload.availabilityAndServiceLocations?.trim()) {
      return 'Availability and service locations are required.';
    }
  }

  if (payload.role === 'Sponsor') {
    if (!payload.description?.trim()) return 'Personal sponsor description is required.';
    if (!payload.agriculturalInterests || payload.agriculturalInterests.length === 0) {
      return 'Select at least one area of agricultural interest.';
    }
    if (!payload.supportTypesProvided || payload.supportTypesProvided.length === 0) {
      return 'Select at least one type of support you provide.';
    }
  }

  return null;
}

/**
 * Ensures users cannot change their own primary role or self-verify their own account.
 * Editing verified identity fields automatically resets verificationStatus to 'Pending Verification'.
 */
export function evaluateProfileUpdatePermissions(params: {
  actorUser: Pick<PlatformUser, 'id' | 'role' | 'verificationStatus'>;
  targetUserId: string;
  attemptedRoleChange?: UserRole;
  attemptedStatusChange?: ProfileVerificationStatus;
  editedVerifiedIdentityFields: boolean;
}): {
  allowed: boolean;
  nextVerificationStatus: ProfileVerificationStatus;
  error?: string;
} {
  const isActorAdmin = params.actorUser.role === 'Admin';
  if (!isActorAdmin && params.actorUser.id !== params.targetUserId) {
    return {
      allowed: false,
      nextVerificationStatus: params.actorUser.verificationStatus,
      error: 'You may only update your own profile.',
    };
  }

  if (!isActorAdmin && params.attemptedRoleChange && params.attemptedRoleChange !== params.actorUser.role) {
    return {
      allowed: false,
      nextVerificationStatus: params.actorUser.verificationStatus,
      error: 'Users cannot change their primary account role after registration.',
    };
  }

  if (
    !isActorAdmin &&
    params.attemptedStatusChange &&
    params.attemptedStatusChange === 'Verified' &&
    params.actorUser.verificationStatus !== 'Verified'
  ) {
    return {
      allowed: false,
      nextVerificationStatus: params.actorUser.verificationStatus,
      error: 'Users cannot approve their own verification. An authorised Admin reviewer must verify the profile.',
    };
  }

  const nextVerificationStatus: ProfileVerificationStatus =
    !isActorAdmin &&
    params.editedVerifiedIdentityFields &&
    params.actorUser.verificationStatus === 'Verified'
      ? 'Pending Verification'
      : params.actorUser.verificationStatus;

  return {
    allowed: true,
    nextVerificationStatus,
  };
}

/**
 * Enforces Section 6 & 8 rule: A Supervisor can ONLY view/act on projects where:
 * 1) Agreement is accepted/active,
 * 2) Supervision was explicitly required/requested, AND
 * 3) This specific supervisor was invited (for invitation response) or assigned (for reporting).
 */
export function canSupervisorAccessProject(params: {
  supervisorId: string;
  assignment?: Pick<SupervisionAssignment, 'supervisorId' | 'status'>;
  invitation?: Pick<SupervisionRequest, 'invitedSupervisorId' | 'status'>;
  agreementAccepted: boolean;
  supervisionRequired: boolean;
}): boolean {
  if (!params.agreementAccepted || !params.supervisionRequired) return false;
  if (params.assignment && params.assignment.supervisorId === params.supervisorId) {
    return true;
  }
  if (
    params.invitation &&
    params.invitation.invitedSupervisorId === params.supervisorId &&
    (params.invitation.status === 'Invited' || params.invitation.status === 'Accepted')
  ) {
    return true;
  }
  return false;
}

/**
 * Enforces Section 6 rule: Supervisors have zero wallet transfer or escrow release powers.
 */
export function canRoleExecuteWalletTransfer(role: UserRole): boolean {
  return role === 'Worker' || role === 'Farmer' || role === 'Sponsor';
}

/**
 * Enforces Section 13/4/5/6/7 rule: A logged-in user is strictly locked to their primary role's dashboard.
 */
export function canAccessRoleDashboard(userRole: UserRole, targetDashboard: UserRole): boolean {
  return userRole === targetDashboard;
}

// ============================================================================
// STELLAR WAGE & SPONSOR 30% SHARE CALCULATIONS (PRESERVED + FLEXIBLE)
// ============================================================================

export interface WorkerUsdcObligationBreakdown {
  workersCount: number;
  wagePerWorkerNaira: number;
  totalWageObligationNaira: number;
  referenceRateNgnPerUsdc: number;
  usdcPerWorker: number;
  totalUsdcObligation: number;
  sponsorShareDeducted: 0;
  individualWorkerObligations: {
    workerIndex: number;
    amountNaira: number;
    amountUsdc: number;
    sponsorShareDeducted: 0;
  }[];
}

export function calculateWorkerWageUsdcObligations(params: {
  workersCount: number;
  wagePerWorkerNaira: number;
  referenceRateNgnPerUsdc: number;
}): WorkerUsdcObligationBreakdown {
  const count = Math.max(0, Math.floor(params.workersCount));
  const wageNgn = Math.max(0, params.wagePerWorkerNaira);
  const rate = params.referenceRateNgnPerUsdc > 0 ? params.referenceRateNgnPerUsdc : 1600;

  const usdcPerWorker = Number((wageNgn / rate).toFixed(4));
  const totalUsdcObligation = Number((usdcPerWorker * count).toFixed(4));
  const totalWageObligationNaira = count * wageNgn;

  const individualWorkerObligations = Array.from({ length: count }, (_, idx) => ({
    workerIndex: idx + 1,
    amountNaira: wageNgn,
    amountUsdc: usdcPerWorker,
    sponsorShareDeducted: 0 as const,
  }));

  return {
    workersCount: count,
    wagePerWorkerNaira: wageNgn,
    totalWageObligationNaira,
    referenceRateNgnPerUsdc: rate,
    usdcPerWorker,
    totalUsdcObligation,
    sponsorShareDeducted: 0,
    individualWorkerObligations,
  };
}

export function calculateWorkerUsdcPaymentObligation(params: {
  workersCount: number;
  wagePerWorkerNaira: number;
  approvedNgnPerUsdcRate: number;
}) {
  const breakdown = calculateWorkerWageUsdcObligations({
    workersCount: params.workersCount,
    wagePerWorkerNaira: params.wagePerWorkerNaira,
    referenceRateNgnPerUsdc: params.approvedNgnPerUsdcRate,
  });
  return {
    workersCount: breakdown.workersCount,
    wagePerWorkerNaira: breakdown.wagePerWorkerNaira,
    totalObligationNaira: breakdown.totalWageObligationNaira,
    perWorkerUsdc: breakdown.usdcPerWorker,
    totalObligationUsdc: breakdown.totalUsdcObligation,
    sponsorShareDeducted: 0 as const,
  };
}

export function validateStellarPaymentDraft(params: {
  senderAddress: string;
  recipientAddress: string;
  assetCode: 'USDC' | 'XLM';
  assetIssuer: string;
  network: StellarNetworkType;
  amount: number;
  availableBalance: number;
  senderActivated: boolean;
  senderHasUsdcTrustline: boolean;
}): string | null {
  if (!params.senderActivated) {
    return 'Your Stellar wallet is not activated yet. Activate your wallet on Stellar Testnet first.';
  }
  if (!isValidStellarPublicAddress(params.recipientAddress)) {
    return 'Please enter a valid Stellar Ed25519 recipient public key starting with G.';
  }
  if (params.senderAddress.trim() === params.recipientAddress.trim()) {
    return 'Self-payment to the same Stellar wallet address is not allowed.';
  }
  const assetCheck = validateOfficialStellarAsset({
    assetCode: params.assetCode,
    assetIssuer: params.assetIssuer,
    network: params.network,
  });
  if (!assetCheck.valid) {
    return assetCheck.reason || 'Invalid Stellar asset configuration.';
  }
  if (params.assetCode === 'USDC' && !params.senderHasUsdcTrustline) {
    return 'Your wallet does not have an active official Circle USDC trustline yet.';
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    return 'Payment amount must be greater than zero.';
  }
  if (params.amount > params.availableBalance) {
    return `Insufficient available ${params.assetCode} balance (${params.availableBalance.toFixed(2)} ${params.assetCode} available).`;
  }
  return null;
}

export function validateSorobanEscrowTransition(params: {
  escrowDomain: 'SPONSOR_SUPPORT_30_PERCENT' | 'WORKER_WAGE_0_PERCENT';
  currentStatus: SupportFundingAgreementRecord['status'] | WorkerPaymentAgreementRecord['paymentStatus'];
  requestedAction: 'DEPOSIT' | 'RELEASE' | 'REFUND' | 'DISPUTE';
  bothPartiesAccepted: boolean;
  evidenceOrWorkVerified: boolean;
}): { allowed: boolean; nextStatus: string; error?: string } {
  if (!params.bothPartiesAccepted && params.requestedAction !== 'REFUND') {
    return {
      allowed: false,
      nextStatus: params.currentStatus,
      error: 'Both parties must explicitly accept the agreement before escrow funds can be deposited or released.',
    };
  }

  if (params.escrowDomain === 'SPONSOR_SUPPORT_30_PERCENT') {
    if (params.currentStatus === 'Released to Farmer') {
      return {
        allowed: false,
        nextStatus: params.currentStatus,
        error: 'Double-payment prevention: Soroban support escrow has already been released.',
      };
    }
    if (params.requestedAction === 'DEPOSIT') {
      return { allowed: true, nextStatus: 'Funded in Escrow' };
    }
    if (params.requestedAction === 'RELEASE') {
      if (params.currentStatus !== 'Funded in Escrow') {
        return {
          allowed: false,
          nextStatus: params.currentStatus,
          error: 'Escrow must be funded before releasing support to the farmer.',
        };
      }
      return { allowed: true, nextStatus: 'Released to Farmer' };
    }
    if (params.requestedAction === 'REFUND') {
      return { allowed: true, nextStatus: 'Refunded' };
    }
    return { allowed: true, nextStatus: 'Disputed' };
  }

  if (params.currentStatus === 'Confirmed Paid' || params.currentStatus === 'Released to Worker') {
    return {
      allowed: false,
      nextStatus: params.currentStatus,
      error: 'Double-payment prevention: Worker wage escrow has already been released.',
    };
  }
  if (params.requestedAction === 'DEPOSIT') {
    return { allowed: true, nextStatus: 'Escrow Funded' };
  }
  if (params.requestedAction === 'RELEASE') {
    if (!params.evidenceOrWorkVerified) {
      return {
        allowed: false,
        nextStatus: params.currentStatus,
        error: 'Work completion must be confirmed by the hiring party before releasing worker wages from escrow.',
      };
    }
    return { allowed: true, nextStatus: 'Released to Worker' };
  }
  return { allowed: true, nextStatus: params.currentStatus };
}

export interface SponsorReturnCalculationResult {
  sharePercentage: 0 | 30;
  farmerRetentionPercentage: 70 | 100;
  shareType: ShareArrangementType;
  sponsorShareValue: number;
  farmerRetainedValue: number;
  formattedSummary: string;
}

export function calculateSponsorThirtyPercentShare(params: {
  shareType: ShareArrangementType;
  eligibleTotalAmount: number;
  unitLabel: string;
}): SponsorReturnCalculationResult {
  const safeTotal = Math.max(0, Number(params.eligibleTotalAmount) || 0);
  if (params.shareType === 'None (Standard Support)') {
    return {
      sharePercentage: 0,
      farmerRetentionPercentage: 100,
      shareType: params.shareType,
      sponsorShareValue: 0,
      farmerRetainedValue: safeTotal,
      formattedSummary: `No 30% produce/proceeds share applies (${safeTotal.toLocaleString('en-NG')} ${params.unitLabel} retained by farmer; terms defined explicitly in agreement).`,
    };
  }

  const sponsorShareValue = Math.round(safeTotal * 0.3 * 100) / 100;
  const farmerRetainedValue = Math.round(safeTotal * 0.7 * 100) / 100;

  const formattedSummary =
    params.shareType === '30% Farm Produce Share'
      ? `Sponsor receives 30% (${sponsorShareValue.toLocaleString('en-NG')} ${params.unitLabel}) of eligible harvest produce; Farmer retains 70% (${farmerRetainedValue.toLocaleString('en-NG')} ${params.unitLabel}).`
      : `Sponsor receives 30% (₦${sponsorShareValue.toLocaleString('en-NG')}) of eligible farm proceeds; Farmer retains 70% (₦${farmerRetainedValue.toLocaleString('en-NG')}).`;

  return {
    sharePercentage: 30,
    farmerRetentionPercentage: 70,
    shareType: params.shareType,
    sponsorShareValue,
    farmerRetainedValue,
    formattedSummary,
  };
}

export interface WorkerWageSummary {
  workersCount: number;
  paymentBasis: WorkerPaymentBasis;
  unitAmountNaira: number;
  totalLabourBudgetNaira: number;
  sponsorShareDeducted: 0;
  formattedRuleNotice: string;
}

export function calculateWorkerWageSummary(params: {
  workersNeeded: number;
  paymentAmountNaira: number;
  paymentBasis: WorkerPaymentBasis;
  durationDays?: number;
}): WorkerWageSummary {
  const workersCount = Math.max(1, Math.floor(Number(params.workersNeeded) || 1));
  const unitAmountNaira = Math.max(0, Number(params.paymentAmountNaira) || 0);
  const days = Math.max(1, Math.floor(Number(params.durationDays) || 1));

  let totalLabourBudgetNaira = 0;
  if (params.paymentBasis === 'Per Worker (Total Task)') {
    totalLabourBudgetNaira = workersCount * unitAmountNaira;
  } else if (params.paymentBasis === 'Per Worker (Daily)') {
    totalLabourBudgetNaira = workersCount * unitAmountNaira * days;
  } else {
    totalLabourBudgetNaira = unitAmountNaira;
  }

  return {
    workersCount,
    paymentBasis: params.paymentBasis,
    unitAmountNaira,
    totalLabourBudgetNaira,
    sponsorShareDeducted: 0,
    formattedRuleNotice: `Total Direct Labour Wage: ₦${totalLabourBudgetNaira.toLocaleString('en-NG')} across ${workersCount} worker(s). 0% Sponsor Share Deducted — Farm workers receive 100% of their agreed wages.`,
  };
}

export function acceptSponsorAgreementParty(
  agreement: SponsorFundingAgreement,
  party: 'Farmer' | 'Sponsor',
  timestampIso: string
): SponsorFundingAgreement {
  const updated: SponsorFundingAgreement = {
    ...agreement,
    historyLog: [...agreement.historyLog],
    updatedAt: timestampIso,
  };

  if (party === 'Farmer' && !updated.farmerAccepted) {
    updated.farmerAccepted = true;
    updated.farmerAcceptedAt = timestampIso;
    updated.historyLog.push(
      `Farmer (${updated.farmerName}) explicitly accepted agreement terms (${updated.shareType}) at ${timestampIso}`
    );
  }

  if (party === 'Sponsor' && !updated.sponsorAccepted) {
    updated.sponsorAccepted = true;
    updated.sponsorAcceptedAt = timestampIso;
    updated.historyLog.push(
      `Sponsor (${updated.sponsorName}) explicitly accepted agreement terms (${updated.shareType}) at ${timestampIso}`
    );
  }

  if (updated.farmerAccepted && updated.sponsorAccepted) {
    updated.status = 'Active Agreement';
    updated.historyLog.push(
      `Agreement activated after mutual acceptance by both Farmer and Sponsor at ${timestampIso}`
    );
  } else {
    updated.status = 'Pending Acceptance';
  }

  return updated;
}

export function evaluateWorkerPaymentTransition(
  payment: WorkerPayment,
  action: 'FARMER_CONFIRM_WORK_AND_INITIATE' | 'WORKER_CONFIRM_RECEIPT',
  timestampIso: string
): WorkerPayment {
  const next: WorkerPayment = {
    ...payment,
    sponsorShareDeducted: 0,
    updatedAt: timestampIso,
  };

  if (action === 'FARMER_CONFIRM_WORK_AND_INITIATE') {
    next.workConfirmedByFarmer = true;
  } else if (action === 'WORKER_CONFIRM_RECEIPT') {
    next.paymentConfirmedByWorker = true;
  }

  let nextStatus: WorkerPaymentStatus = 'Pending Work Completion';
  if (next.workConfirmedByFarmer && next.paymentConfirmedByWorker) {
    nextStatus = 'Confirmed Paid';
    next.paidAt = timestampIso;
  } else if (next.workConfirmedByFarmer && !next.paymentConfirmedByWorker) {
    nextStatus = 'Awaiting Payment Confirmation';
  }

  next.status = nextStatus;
  return next;
}

export function validateSupportRequestDraft(draft: Partial<SupportRequest>): string | null {
  if (!draft.title?.trim()) return 'Request title is required.';
  if (!draft.farmName?.trim()) return "Farmer's farm name is required.";
  if (!draft.farmingType?.trim()) return 'Farming type is required.';
  if (!draft.cropOrProduceType?.trim()) return 'Crop or produce type is required.';
  if (!draft.location?.trim()) return 'Farm location is required.';
  if (!draft.farmSize?.trim()) return 'Farm size is required.';
  if (!draft.description?.trim() || draft.description.trim().length < 15) {
    return 'Please provide a clear description of the farming project (at least 15 characters).';
  }
  if (!draft.farmingPeriod?.trim()) return 'Expected farming period is required.';
  if (!draft.expectedHarvestDate?.trim()) return 'Expected harvest date is required.';
  if (!draft.estimatedOutput?.trim()) return 'Estimated harvest or farm output is required.';
  if (!draft.preferredShareModel) {
    return 'Please choose whether this request uses standard support terms or an explicit 30% Produce / Farm Funds arrangement.';
  }
  if (
    draft.preferredShareModel !== 'None (Standard Support)' &&
    !draft.acknowledgedThirtyPercentNotice
  ) {
    return 'You must explicitly confirm and acknowledge the 30% Produce or Farm Funds sharing arrangement before submitting.';
  }
  return null;
}

export function validateWorkerRequestDraft(draft: Partial<WorkerRequest>): string | null {
  if (!draft.jobTitle?.trim()) return 'Job title is required.';
  if (!draft.workCategory?.trim()) return 'Type of farm work is required.';
  if (draft.workCategory === 'Other agricultural work' && !draft.customWorkCategory?.trim()) {
    return 'Please specify the custom agricultural work category.';
  }
  if (!draft.description?.trim() || draft.description.trim().length < 10) {
    return 'Description of the farm work is required.';
  }
  if (!draft.location?.trim()) return 'Farm location is required.';
  if (!draft.workersNeeded || Number(draft.workersNeeded) < 1) {
    return 'Number of workers needed must be at least 1.';
  }
  if (!draft.requiredSkills?.trim()) return 'Required skills or experience is required.';
  if (!draft.startDate?.trim()) return 'Start date is required.';
  if (!draft.expectedDuration?.trim()) return 'Expected duration is required.';
  if (!draft.workingHours?.trim()) return 'Working hours are required.';
  if (!draft.paymentAmountNaira || Number(draft.paymentAmountNaira) <= 0) {
    return 'Agreed payment amount per worker or team must be greater than ₦0.';
  }
  if (!draft.paymentMethod?.trim()) return 'Payment method is required.';
  if (!draft.acknowledgedWageRule) {
    return 'Please confirm that farm workers are paid directly for their labour with 0% sponsor share deduction.';
  }
  return null;
}

export function computeSeparatedPlatformMetrics(params: {
  supportRequests: SupportRequest[];
  sponsorAgreements: SponsorFundingAgreement[];
  workerRequests: WorkerRequest[];
  workerPayments: WorkerPayment[];
}) {
  const activeSponsorAgreements = params.sponsorAgreements.filter(
    (a) => a.status === 'Active Agreement' || a.status === 'Completed'
  );
  const totalSponsorCommittedNaira = activeSponsorAgreements.reduce(
    (sum, a) => sum + (Number(a.contributionValueNaira) || 0),
    0
  );

  const confirmedWorkerWagesPaidNaira = params.workerPayments
    .filter((p) => p.status === 'Confirmed Paid')
    .reduce((sum, p) => sum + (Number(p.amountNaira) || 0), 0);

  const awaitingConfirmationWagesNaira = params.workerPayments
    .filter((p) => p.status === 'Awaiting Payment Confirmation')
    .reduce((sum, p) => sum + (Number(p.amountNaira) || 0), 0);

  const totalOpenWorkerPositions = params.workerRequests
    .filter((r) => r.status === 'Open' || r.status === 'Hiring in Progress')
    .reduce((sum, r) => sum + Math.max(0, r.workersNeeded - r.workersHired), 0);

  return {
    sponsorSystem: {
      totalSupportRequests: params.supportRequests.length,
      activeSponsorAgreementsCount: activeSponsorAgreements.length,
      pendingSponsorAgreementsCount: params.sponsorAgreements.filter(
        (a) => a.status === 'Pending Acceptance'
      ).length,
      totalSponsorCommittedNaira,
      fixedSponsorSharePercentage: 30 as const,
    },
    workerSystem: {
      totalWorkerRequests: params.workerRequests.length,
      totalOpenWorkerPositions,
      confirmedWorkerWagesPaidNaira,
      awaitingConfirmationWagesNaira,
      sponsorDeductionOnWorkerWages: 0 as const,
    },
  };
}

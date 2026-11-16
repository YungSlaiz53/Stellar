export type UserRole = 'Farmer' | 'Worker' | 'Sponsor' | 'Company' | 'Admin';

export type ShareArrangementType = '30% Farm Produce Share' | '30% Farm Funds Share';

export type AssistanceType =
  | 'Financial Support'
  | 'Agricultural Materials'
  | 'Equipment'
  | 'Combined Support';

export type SupportRequestStatus =
  | 'Open'
  | 'Under Review'
  | 'Agreement Pending'
  | 'Active Support'
  | 'Completed';

export interface SupportRequest {
  id: string;
  farmerId: string;
  farmerName: string;
  title: string;
  farmName: string;
  farmingType: string;
  cropOrProduceType: string;
  location: string;
  farmSize: string;
  description: string;
  assistanceType: AssistanceType;
  fundingAmount: number;
  materialsOrEquipment: string;
  farmingPeriod: string;
  expectedHarvestDate: string;
  estimatedOutput: string;
  preferredShareModel: ShareArrangementType;
  acknowledgedThirtyPercentNotice: boolean;
  photographs: string[];
  supportingDocuments: string[];
  status: SupportRequestStatus;
  createdAt: string;
}

export type SponsorAgreementStatus =
  | 'Pending Acceptance'
  | 'Active Agreement'
  | 'Completed'
  | 'Disputed';

export interface SponsorFundingAgreement {
  id: string;
  requestId: string;
  requestTitle: string;
  farmerId: string;
  farmerName: string;
  sponsorId: string;
  sponsorName: string;
  sponsorContribution: string;
  contributionValueNaira: number;
  sharePercentage: 30;
  shareType: ShareArrangementType;
  calculationMethod: string;
  entitlementTiming: string;
  measurementVerification: string;
  lossOrPoorHarvestClause: string;
  additionalConditions: string;
  farmerAccepted: boolean;
  farmerAcceptedAt: string;
  sponsorAccepted: boolean;
  sponsorAcceptedAt: string;
  status: SponsorAgreementStatus;
  historyLog: string[];
  createdAt: string;
}

export const FARM_WORK_CATEGORIES = [
  'Land clearing',
  'Land preparation',
  'Planting',
  'Weeding',
  'Fertiliser application',
  'Irrigation',
  'Harvesting',
  'Sorting and packaging',
  'Loading and transportation',
  'Livestock care',
  'General farm labour',
  'Tractor and machinery operation',
  'Other farm-related work',
] as const;

export type FarmWorkCategory = (typeof FARM_WORK_CATEGORIES)[number];

export type WorkerPaymentBasis =
  | 'Per Worker (Total Task)'
  | 'Per Worker (Daily)'
  | 'Agreed Total Team Payment';

export type WorkerRequestStatus =
  | 'Open'
  | 'Hiring in Progress'
  | 'In Progress'
  | 'Completed';

export interface WorkerRequest {
  id: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  jobTitle: string;
  workCategory: string;
  customWorkCategory: string;
  description: string;
  location: string;
  workersNeeded: number;
  workersHired: number;
  requiredSkills: string;
  startDate: string;
  expectedDuration: string;
  workingHours: string;
  paymentAmountNaira: number;
  paymentBasis: WorkerPaymentBasis;
  paymentMethod: string;
  accommodationOrFeeding: string;
  contactInstructions: string;
  photographs: string[];
  acknowledgedWageRule: boolean;
  status: WorkerRequestStatus;
  createdAt: string;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  fullName: string;
  profilePicture: string;
  location: string;
  skills: string[];
  farmingExperience: string;
  availableWorkTypes: string[];
  availability: string;
  expectedWageNaira: number;
  wageUnit: string;
  contactPhone: string;
  contactVisibility: 'Accepted Farmers Only' | 'Verified Farmers' | 'Hidden Until Offer';
  verificationStatus: 'Verified' | 'Pending Verification' | 'Unverified';
  completedJobsCount: number;
  createdAt: string;
}

export type WorkerApplicationStatus =
  | 'Applied'
  | 'Offered by Farmer'
  | 'Accepted by Worker'
  | 'Declined by Worker'
  | 'Rejected'
  | 'Work Completed';

export interface WorkerApplication {
  id: string;
  workerRequestId: string;
  jobTitle: string;
  workCategory: string;
  location: string;
  farmerId: string;
  farmerName: string;
  workerId: string;
  workerName: string;
  workerSkills: string;
  proposedWageNaira: number;
  message: string;
  status: WorkerApplicationStatus;
  createdAt: string;
}

export interface WorkerAgreement {
  id: string;
  workerRequestId: string;
  applicationId: string;
  jobTitle: string;
  farmerId: string;
  farmerName: string;
  workerId: string;
  workerName: string;
  agreedWageNaira: number;
  paymentBasis: string;
  paymentMethod: string;
  startDate: string;
  expectedDuration: string;
  workCompletedConfirmed: boolean;
  status: 'Offer Sent' | 'Active Work' | 'Work Completed' | 'Declined';
  createdAt: string;
}

export type WorkerPaymentStatus =
  | 'Pending Work Completion'
  | 'Awaiting Payment Confirmation'
  | 'Confirmed Paid'
  | 'Disputed';

export interface WorkerPayment {
  id: string;
  workerAgreementId: string;
  workerRequestId: string;
  jobTitle: string;
  farmerId: string;
  farmerName: string;
  workerId: string;
  workerName: string;
  amountNaira: number;
  sponsorShareDeducted: 0;
  paymentMethod: string;
  workConfirmedByFarmer: boolean;
  paymentConfirmedByWorker: boolean;
  status: WorkerPaymentStatus;
  paidAt: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  contextTitle: string;
  body: string;
  replyToId?: string;
  replyToPreview?: string;
  createdAt: string;
}

export interface DisputeRecord {
  id: string;
  category: 'Sponsor Support Agreement' | 'Worker Wage Payment';
  referenceId: string;
  title: string;
  raisedById: string;
  raisedByName: string;
  summary: string;
  status: 'Open' | 'Under Mediation' | 'Resolved';
  resolutionNotes: string;
  createdAt: string;
}

// ============================================================================
// STELLAR EMBEDDED WALLET, USDC & SOROBAN ESCROW TYPES (SECTIONS 1–16)
// ============================================================================

export type StellarNetworkType = 'TESTNET' | 'PUBLIC';

export type WalletAccountState =
  | 'Wallet Creation Pending'
  | 'Wallet Created'
  | 'Activation Required'
  | 'Activation Pending'
  | 'Active'
  | 'Restricted'
  | 'Recovery Required'
  | 'Wallet Service Unavailable';

export interface OrganisationRepresentative {
  repId: string;
  fullName: string;
  email: string;
  roleTitle: string;
  canApproveTransfers: boolean;
}

export interface UserWallet {
  walletId: string;
  userId: string;
  role: UserRole;
  displayName?: string;
  organisationName?: string;
  authorisedRepresentatives?: OrganisationRepresentative[];
  approvalPolicy?: string;
  walletAddress: string;
  provider: string;
  custodyModel: string;
  network: StellarNetworkType;
  status: WalletAccountState;
  usdcBalance?: string;
  availableUsdcBalance?: string;
  pendingEscrowUsdcBalance?: string;
  xlmBalance?: string;
  hasUsdcTrustline?: boolean;
  horizonReachable?: boolean;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string;
}

export type WalletTransactionStatus =
  | 'Pending Verification'
  | 'Verified'
  | 'Failed'
  | 'Rejected';

export type WalletTransactionType =
  | 'Account Activation (Friendbot)'
  | 'USDC Trustline Setup'
  | 'Direct Transfer'
  | 'Sponsor Escrow Deposit'
  | 'Sponsor Escrow Release'
  | 'Sponsor Escrow Refund'
  | 'Worker Wage Escrow Deposit'
  | 'Worker Wage Release';

export interface WalletTransaction {
  transactionId: string;
  userId: string;
  walletId: string;
  transactionHash: string;
  transactionType: WalletTransactionType | string;
  assetCode: 'USDC' | 'XLM';
  assetIssuer: string;
  amount: number;
  senderAddress: string;
  recipientAddress: string;
  memoReference?: string;
  relatedRequestId: string;
  relatedAgreementId: string;
  relatedWorkerJobId: string;
  status: WalletTransactionStatus;
  explorerUrl?: string;
  createdAt: string;
  verifiedAt: string;
}

export interface SupportFundingAgreementRecord {
  agreementId: string;
  farmerId: string;
  farmerName?: string;
  sponsorId: string;
  sponsorName?: string;
  requestId: string;
  requestTitle?: string;
  contributionAmount: number;
  asset: 'USDC' | 'XLM';
  shareType: ShareArrangementType;
  agreedSharePercentage: 30;
  conditions: string;
  acceptanceRecords: string;
  escrowAddress: string;
  transactionHash: string;
  status: 'Created' | 'Funded in Escrow' | 'Released to Farmer' | 'Refunded' | 'Disputed';
  createdAt: string;
  updatedAt: string;
}

export interface WorkerPaymentAgreementRecord {
  agreementId: string;
  farmerId: string;
  farmerName?: string;
  workerId: string;
  workerName?: string;
  workerWalletAddress?: string;
  workerRequestId: string;
  jobTitle?: string;
  agreedWage: number;
  paymentAsset: 'USDC' | 'XLM';
  paymentAmount: number;
  conversionRateUsedNgnPerUsdc?: number;
  sponsorShareDeducted?: 0;
  workStatus: 'Assigned' | 'In Progress' | 'Work Confirmed';
  paymentStatus: 'Pending Funding' | 'Escrow Funded' | 'Released to Worker' | 'Confirmed Paid';
  transactionHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletActivationRecord {
  activationId: string;
  userId: string;
  walletId: string;
  activationMethod: string;
  transactionHash: string;
  status: 'Pending' | 'Verified Active' | 'Failed';
  createdAt: string;
  verifiedAt: string;
}

export interface WalletAuditLog {
  logId: string;
  actorId: string;
  action: string;
  targetUserId: string;
  walletId: string;
  transactionReference: string;
  timestamp: string;
  result: string;
}

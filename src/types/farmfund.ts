export type UserRole = 'Worker' | 'Farmer' | 'Supervisor' | 'Sponsor' | 'Admin';

export type PublicUserRole = 'Worker' | 'Farmer' | 'Supervisor' | 'Sponsor';

export type SponsorType = 'individual' | 'organisation';

export type ProfileVerificationStatus =
  | 'Pending Verification'
  | 'Verified'
  | 'Rejected'
  | 'More Information Required';

export type ShareArrangementType =
  | 'None (Standard Support)'
  | '30% Farm Produce Share'
  | '30% Farm Funds Share';

export type AssistanceType =
  | 'Financial Support'
  | 'Seeds & Fertiliser'
  | 'Agricultural Equipment'
  | 'Irrigation'
  | 'Farm Materials'
  | 'Other Agricultural Support';

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
  'Other agricultural work',
] as const;

export type FarmWorkCategory = (typeof FARM_WORK_CATEGORIES)[number];

export const SUPERVISOR_SPECIALISATIONS = [
  'Crop production',
  'Livestock management',
  'Farm operations',
  'Agricultural project management',
  'Harvest supervision',
  'Farm labour supervision',
  'Quality control',
  'Agricultural logistics',
  'Irrigation management',
  'General agricultural supervision',
] as const;

export type SupervisorSpecialisation = (typeof SUPERVISOR_SPECIALISATIONS)[number];

export const SUPPORT_CATEGORY_OPTIONS: AssistanceType[] = [
  'Financial Support',
  'Seeds & Fertiliser',
  'Agricultural Equipment',
  'Irrigation',
  'Farm Materials',
  'Other Agricultural Support',
];

// ============================================================================
// CORE USER & FOUR ROLE PROFILES (SECTIONS 2 & 12)
// ============================================================================

export interface PlatformUser {
  id: string;
  uid: string;
  role: UserRole;
  sponsorType?: SponsorType;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  lga: string;
  townOrLocation: string;
  profilePicture: string;
  governmentIdDocument: string;
  verificationStatus: ProfileVerificationStatus;
  verificationNotes?: string;
  accountCode?: string;
  mustChangePasswordOnFirstLogin?: boolean;
  status: 'Active' | 'Suspended';
  createdAt: string;
  updatedAt: string;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  lga: string;
  townOrCity: string;
  residentialLocation: string;
  location: string;
  profilePicture: string;
  governmentIdDocument: string;
  skills: string[];
  farmingExperience: string;
  availableWorkTypes: string[];
  availability: string;
  expectedWageNaira: number;
  wageUnit: string;
  bio: string;
  supportingDocuments: string[];
  contactVisibility: 'Accepted Hirers Only' | 'Verified Hirers' | 'Hidden Until Offer';
  verificationStatus: ProfileVerificationStatus;
  completedJobsCount: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface FarmerProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  lga: string;
  townOrFarmLocation: string;
  profilePicture: string;
  governmentIdDocument: string;
  farmName: string;
  farmLocation: string;
  farmingType: string;
  cropsOrLivestock: string;
  farmSize: string;
  yearsOfExperience: string;
  farmDescription: string;
  agriculturalSupportNeeded: string[];
  farmPhotographs: string[];
  supportingDocuments: string[];
  verificationStatus: ProfileVerificationStatus;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface SupervisorProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  lga: string;
  residentialLocation: string;
  profilePicture: string;
  governmentIdDocument: string;
  professionalQualifications: string;
  agriculturalExperience: string;
  specialisations: string[];
  previousSupervisionExperience: string;
  certifications: string[];
  bio: string;
  availabilityAndServiceLocations: string;
  verificationStatus: ProfileVerificationStatus;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface SponsorProfile {
  id: string;
  userId: string;
  sponsorType: SponsorType;
  fullName: string; // Individual full name or Organisation representative / display name
  email: string;
  phone: string;
  country: string;
  location: string;
  profilePicture: string;
  governmentIdDocument: string;
  description: string;
  agriculturalInterests: string[];
  supportTypesProvided: string[];
  socialMediaLinks?: string;
  organisationId?: string;
  verificationStatus: ProfileVerificationStatus;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationProfile {
  id: string;
  userId: string;
  organisationName: string;
  officialEmail: string;
  phone: string;
  officeAddress: string;
  country: string;
  location: string;
  logoUrl: string;
  website: string;
  organisationType: string;
  representativeName: string;
  representativePosition: string;
  representativeIdDocument: string;
  registrationDocuments: string[];
  description: string;
  agriculturalSupportCategories: string[];
  supportTypesAvailable: string[];
  verificationStatus: ProfileVerificationStatus;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ASSISTANCE REQUESTS, SPONSOR OFFERS & SUPPORT AGREEMENTS
// ============================================================================

export type SupportRequestStatus =
  | 'Open'
  | 'Under Review'
  | 'More Information Requested'
  | 'Agreement Pending'
  | 'Active Support'
  | 'Declined'
  | 'Completed';

export interface SupportRequest {
  id: string;
  ownerId: string;
  farmerId: string;
  farmerName: string;
  targetSponsorId?: string;
  targetSponsorName?: string;
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
  explicitlyAgreedThirtyPercent: boolean;
  acknowledgedThirtyPercentNotice: boolean;
  photographs: string[];
  supportingDocuments: string[];
  sponsorReviewNote?: string;
  status: SupportRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorOffer {
  id: string;
  ownerId: string;
  sponsorId: string;
  sponsorName: string;
  sponsorType: SponsorType;
  farmerId: string;
  farmerName: string;
  title: string;
  supportCategory: AssistanceType;
  fundingOrMaterialContribution: string;
  contributionValueNaira: number;
  proposedConditions: string;
  usesThirtyPercentShare: boolean;
  shareType: ShareArrangementType;
  supervisionRecommended: boolean;
  status: 'Sent' | 'Accepted by Farmer' | 'Declined by Farmer' | 'More Information Requested';
  farmerResponseNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type SponsorAgreementStatus =
  | 'Pending Acceptance'
  | 'Active Agreement'
  | 'Completion Recommended'
  | 'Completed'
  | 'Disputed';

export interface SponsorFundingAgreement {
  id: string;
  ownerId: string;
  requestId: string;
  offerId?: string;
  requestTitle: string;
  farmerId: string;
  farmerName: string;
  sponsorId: string;
  sponsorName: string;
  location?: string;
  sponsorContribution: string;
  contributionValueNaira: number;
  usesThirtyPercentShare: boolean;
  sharePercentage: 0 | 30;
  shareType: ShareArrangementType;
  calculationMethod: string;
  entitlementTiming: string;
  measurementVerification: string;
  lossOrPoorHarvestClause: string;
  additionalConditions: string;
  expectedStartDate?: string;
  expectedCompletionDate?: string;
  supervisionRequired: boolean;
  assignedSupervisorId?: string;
  assignedSupervisorName?: string;
  farmerAccepted: boolean;
  farmerAcceptedAt: string;
  sponsorAccepted: boolean;
  sponsorAcceptedAt: string;
  status: SponsorAgreementStatus;
  historyLog: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// WORKER JOBS, APPLICATIONS, AGREEMENTS & WAGES (0% SPONSOR SHARE)
// ============================================================================

export type WorkerPaymentBasis =
  | 'Per Worker (Total Task)'
  | 'Per Worker (Daily)'
  | 'Agreed Total Team Payment';

export type WorkerRequestStatus =
  | 'Open'
  | 'Hiring in Progress'
  | 'In Progress'
  | 'Completed'
  | 'Closed';

export interface WorkerRequest {
  id: string;
  ownerId: string;
  hirerId: string;
  hirerRole: 'Farmer' | 'Sponsor';
  hirerName: string;
  farmerId: string; // Retained for backward compatibility (equals hirerId when Farmer)
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
  supervisionRequired?: boolean;
  status: WorkerRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export type WorkerApplicationStatus =
  | 'Applied'
  | 'Offered by Hirer'
  | 'Accepted'
  | 'Declined'
  | 'Withdrawn'
  | 'Work Completed';

export interface WorkerApplication {
  id: string;
  ownerId: string;
  workerRequestId: string;
  jobTitle: string;
  workCategory: string;
  location: string;
  hirerId: string;
  hirerRole: 'Farmer' | 'Sponsor';
  hirerName: string;
  farmerId: string;
  farmerName: string;
  workerId: string;
  workerName: string;
  workerSkills: string;
  proposedWageNaira: number;
  message: string;
  status: WorkerApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerAgreement {
  id: string;
  ownerId: string;
  workerRequestId: string;
  applicationId: string;
  jobTitle: string;
  hirerId: string;
  hirerRole: 'Farmer' | 'Sponsor';
  hirerName: string;
  farmerId: string;
  farmerName: string;
  workerId: string;
  workerName: string;
  location?: string;
  agreedWageNaira: number;
  paymentBasis: string;
  paymentMethod: string;
  startDate: string;
  expectedDuration: string;
  supervisionRequired: boolean;
  assignedSupervisorId?: string;
  assignedSupervisorName?: string;
  workCompletedConfirmed: boolean;
  status: 'Active Work' | 'Completion Recommended' | 'Work Completed' | 'Declined';
  createdAt: string;
  updatedAt: string;
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
  hirerId?: string;
  hirerName?: string;
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
  updatedAt?: string;
}

// ============================================================================
// SUPERVISION SYSTEM (SECTION 6 & 8 — STRICT SCOPED ACCESS)
// ============================================================================

export type SupervisionAgreementCategory =
  | 'Sponsor & Farmer Support Agreement'
  | 'Sponsor & Worker Hiring Agreement'
  | 'Farmer & Worker Hiring Agreement';

export interface SupervisionRequest {
  id: string;
  ownerId: string;
  requestedById: string;
  requestedByName: string;
  requestedByRole: 'Farmer' | 'Sponsor';
  agreementId: string;
  agreementCategory: SupervisionAgreementCategory;
  projectTitle: string;
  location: string;
  farmerId?: string;
  farmerName?: string;
  sponsorId?: string;
  sponsorName?: string;
  workerId?: string;
  workerName?: string;
  agreedWorkSummary: string;
  expectedStartDate: string;
  expectedCompletionDate: string;
  supervisionInstructions: string;
  invitedSupervisorId: string;
  invitedSupervisorName: string;
  status: 'Invited' | 'Accepted' | 'Declined' | 'Cancelled';
  responseNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupervisionAssignment {
  id: string;
  ownerId: string;
  supervisionRequestId: string;
  agreementId: string;
  agreementCategory: SupervisionAgreementCategory;
  projectTitle: string;
  location: string;
  supervisorId: string;
  supervisorName: string;
  farmerId?: string;
  farmerName?: string;
  sponsorId?: string;
  sponsorName?: string;
  workerId?: string;
  workerName?: string;
  agreedWorkSummary: string;
  expectedStartDate: string;
  expectedCompletionDate: string;
  supervisionRequirements: string;
  status: 'Active Supervision' | 'Completion Recommended' | 'Completed';
  completionRecommendedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupervisionReport {
  id: string;
  ownerId: string;
  assignmentId: string;
  agreementId: string;
  supervisorId: string;
  supervisorName: string;
  reportType:
    | 'Progress Inspection'
    | 'Delay or Issue Report'
    | 'Suspected Resource Misuse Alert'
    | 'Completion Observation & Recommendation';
  summary: string;
  observations: string;
  recommendCompletion: boolean;
  evidenceUrls: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MESSAGING, NOTIFICATIONS, VERIFICATION, UPDATES & ADMIN AUDIT
// ============================================================================

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  participantRoles: Record<string, UserRole>;
  contextType: 'Support' | 'Job' | 'Supervision' | 'General';
  contextId?: string;
  contextTitle: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadByUser: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  contextTitle: string;
  body: string;
  attachments?: string[];
  readBy?: string[];
  replyToId?: string;
  replyToPreview?: string;
  createdAt: string;
}

export interface PlatformNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  category:
    | 'Verification'
    | 'Support Request'
    | 'Job Application'
    | 'Agreement'
    | 'Supervision'
    | 'Message'
    | 'Wallet'
    | 'Acceptance Fee';
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface VerificationApplication {
  id: string;
  userId: string;
  role: UserRole;
  applicantName: string;
  applicantEmail: string;
  governmentIdDocument: string;
  supportingDocuments: string[];
  status: ProfileVerificationStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewerNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
  updatedAt: string;
}

export interface SupportUpdate {
  id: string;
  agreementId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  notes: string;
  photoUrls: string[];
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  reviewerId: string;
  reviewerName: string;
  targetUserId: string;
  agreementId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface DisputeRecord {
  id: string;
  category:
    | 'Sponsor Support Agreement'
    | 'Worker Wage Payment'
    | 'Supervision Report'
    | 'Acceptance Fee / Absconding';
  referenceId: string;
  title: string;
  raisedById: string;
  raisedByName: string;
  summary: string;
  status: 'Open' | 'Under Mediation' | 'Resolved';
  resolutionNotes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetCollection: string;
  targetId: string;
  summary: string;
  createdAt: string;
}

export interface PlatformSettings {
  id: string;
  platformName: string;
  activeNetwork: StellarNetworkType;
  requireEmailVerification: boolean;
  defaultThirtyPercentNoticeEnabled: boolean;
  updatedBy: string;
  updatedAt: string;
}

// ============================================================================
// STELLAR EMBEDDED WALLET, USDC & SOROBAN ESCROW TYPES (PRESERVED)
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
  sponsorType?: SponsorType;
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
  | 'Worker Wage Release'
  | 'Acceptance Fee Deposit'
  | 'Acceptance Fee Refund'
  | 'Acceptance Fee Forfeit Payout'
  | 'Farm Sponsorship Disbursement'
  | 'Post-Work Farmer Settlement'
  | 'Post-Work Worker Wage USDC'
  | 'Supervision Fee USDC'
  | 'Testnet XLM → Circle USDC Swap';

export type AcceptanceFeeStatus =
  | 'Pending Deposit'
  | 'Locked in Escrow'
  | 'Refunded'
  | 'Forfeited (Absconded)'
  | 'Disputed';

export interface AcceptanceFeeRecord {
  id: string;
  ownerId: string;
  obligorId: string;
  obligorName: string;
  obligorRole: 'Worker' | 'Farmer';
  beneficiaryId: string;
  beneficiaryName: string;
  agreementType: 'WorkerHiring' | 'SponsorSupport';
  agreementId: string;
  agreementTitle: string;
  agreedPrincipalNaira: number;
  feeAmountNaira: number;
  feeAmountUsdc: number;
  assetCode: 'USDC';
  status: AcceptanceFeeStatus;
  escrowReference: string;
  transactionHash: string;
  settlementHash?: string;
  abscondedReason?: string;
  reportedById?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

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
  agreedSharePercentage: 0 | 30;
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

// ============================================================================
// FULL HYDRATED PLATFORM SNAPSHOT RETURNED FROM BACKEND
// ============================================================================

export interface RegistrationPayload {
  role: PublicUserRole;
  sponsorType?: SponsorType;
  fullName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  state: string;
  lga: string;
  townOrLocation: string;
  profilePicture?: string;
  governmentIdDocument: string;
  // Worker-specific
  skills?: string[];
  farmingExperience?: string;
  availableWorkTypes?: string[];
  expectedWageNaira?: number;
  wageUnit?: string;
  availability?: string;
  bio?: string;
  supportingDocuments?: string[];
  // Farmer-specific
  farmName?: string;
  farmLocation?: string;
  farmingType?: string;
  cropsOrLivestock?: string;
  farmSize?: string;
  yearsOfExperience?: string;
  farmDescription?: string;
  agriculturalSupportNeeded?: string[];
  farmPhotographs?: string[];
  // Supervisor-specific
  professionalQualifications?: string;
  agriculturalExperience?: string;
  specialisations?: string[];
  previousSupervisionExperience?: string;
  certifications?: string[];
  availabilityAndServiceLocations?: string;
  // Sponsor (Individual + Organisation)
  description?: string;
  agriculturalInterests?: string[];
  supportTypesProvided?: string[];
  socialMediaLinks?: string;
  organisationName?: string;
  officeAddress?: string;
  logoUrl?: string;
  website?: string;
  organisationType?: string;
  representativeName?: string;
  representativePosition?: string;
  representativeIdDocument?: string;
  registrationDocuments?: string[];
  agriculturalSupportCategories?: string[];
}

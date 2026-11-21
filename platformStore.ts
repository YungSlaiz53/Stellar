import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Express, Request, Response } from 'express';
import type {
  AcceptanceFeeRecord,
  AdminAuditLog,
  Conversation,
  DirectMessage,
  DisputeRecord,
  FarmerProfile,
  OrganisationProfile,
  PlatformNotification,
  PlatformSettings,
  PlatformUser,
  ProfileVerificationStatus,
  RegistrationPayload,
  ReviewRecord,
  SponsorFundingAgreement,
  SponsorOffer,
  SponsorProfile,
  SupervisionAssignment,
  SupervisionReport,
  SupervisionRequest,
  SupervisorProfile,
  SupportRequest,
  SupportUpdate,
  UserRole,
  VerificationApplication,
  WorkerAgreement,
  WorkerApplication,
  WorkerPayment,
  WorkerProfile,
  WorkerRequest,
} from './src/types/farmfund';
import {
  acceptSponsorAgreementParty,
  calculateAcceptanceFee,
  canRoleExecuteWalletTransfer,
  canSupervisorAccessProject,
  evaluateAcceptanceFeeTransition,
  evaluateProfileUpdatePermissions,
  evaluateWorkerPaymentTransition,
  validateRegistrationPayload,
  validateSupportRequestDraft,
  validateWorkerRequestDraft,
} from './src/utils/farmfundLogic';

const PLATFORM_FILE = path.resolve(process.cwd(), '.farmfund-platform.json');

interface StoredCredential {
  userId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export interface PlatformDatabaseState {
  credentials: Record<string, StoredCredential>;
  users: Record<string, PlatformUser>;
  workerProfiles: Record<string, WorkerProfile>;
  farmerProfiles: Record<string, FarmerProfile>;
  supervisorProfiles: Record<string, SupervisorProfile>;
  sponsorProfiles: Record<string, SponsorProfile>;
  organisations: Record<string, OrganisationProfile>;
  assistanceRequests: SupportRequest[];
  sponsorOffers: SponsorOffer[];
  workerRequests: WorkerRequest[];
  workerApplications: WorkerApplication[];
  supportAgreements: SponsorFundingAgreement[];
  workerAgreements: WorkerAgreement[];
  workerPayments: WorkerPayment[];
  supervisionRequests: SupervisionRequest[];
  supervisionAssignments: SupervisionAssignment[];
  supervisionReports: SupervisionReport[];
  conversations: Conversation[];
  messages: DirectMessage[];
  notifications: PlatformNotification[];
  verificationApplications: VerificationApplication[];
  supportUpdates: SupportUpdate[];
  disputes: DisputeRecord[];
  reviews: ReviewRecord[];
  adminAuditLogs: AdminAuditLog[];
  acceptanceFees: AcceptanceFeeRecord[];
  platformSettings: PlatformSettings;
}

function hashUserPassword(raw: string): string {
  return crypto.createHash('sha256').update(`farmfund-platform-salt:${raw}`).digest('hex');
}

function createEmptyPlatformState(): PlatformDatabaseState {
  const nowIso = new Date().toISOString();
  return {
    credentials: {},
    users: {},
    workerProfiles: {},
    farmerProfiles: {},
    supervisorProfiles: {},
    sponsorProfiles: {},
    organisations: {},
    assistanceRequests: [],
    sponsorOffers: [],
    workerRequests: [],
    workerApplications: [],
    supportAgreements: [],
    workerAgreements: [],
    workerPayments: [],
    supervisionRequests: [],
    supervisionAssignments: [],
    supervisionReports: [],
    conversations: [],
    messages: [],
    notifications: [],
    verificationApplications: [],
    supportUpdates: [],
    disputes: [],
    reviews: [],
    adminAuditLogs: [],
    acceptanceFees: [],
    platformSettings: {
      id: 'default',
      platformName: 'FarmFund',
      activeNetwork: 'TESTNET',
      requireEmailVerification: true,
      defaultThirtyPercentNoticeEnabled: true,
      updatedBy: 'system',
      updatedAt: nowIso,
    },
  };
}

function loadPlatformState(): PlatformDatabaseState {
  try {
    if (fs.existsSync(PLATFORM_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PLATFORM_FILE, 'utf8')) as Partial<PlatformDatabaseState>;
      const empty = createEmptyPlatformState();
      return {
        ...empty,
        ...parsed,
      };
    }
  } catch {
    // Fallback to clean empty state
  }
  return createEmptyPlatformState();
}

export const platformState: PlatformDatabaseState = loadPlatformState();

export function savePlatformState(): void {
  try {
    fs.writeFileSync(PLATFORM_FILE, JSON.stringify(platformState, null, 2), { mode: 0o600 });
  } catch {
    // Non-fatal in read-only runtimes
  }
}

function pushNotification(params: {
  userId: string;
  title: string;
  body: string;
  category: PlatformNotification['category'];
  relatedId?: string;
}) {
  if (!params.userId) return;
  const n: PlatformNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: params.userId,
    title: params.title,
    body: params.body,
    category: params.category,
    relatedId: params.relatedId,
    read: false,
    createdAt: new Date().toISOString(),
  };
  platformState.notifications.unshift(n);
}

function pushAdminAudit(params: {
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetCollection: string;
  targetId: string;
  summary: string;
}) {
  const entry: AdminAuditLog = {
    id: `paud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...params,
    createdAt: new Date().toISOString(),
  };
  platformState.adminAuditLogs.unshift(entry);
}

export function ensureDevUserRecord(params: {
  userId: string;
  role: UserRole;
  sponsorType?: 'individual' | 'organisation';
  displayName: string;
  email: string;
  accountCode: string;
  mustChangePasswordOnFirstLogin: boolean;
}) {
  const nowIso = new Date().toISOString();
  if (platformState.users[params.userId]) {
    platformState.users[params.userId].mustChangePasswordOnFirstLogin =
      params.mustChangePasswordOnFirstLogin;
    platformState.users[params.userId].updatedAt = nowIso;
    savePlatformState();
    return platformState.users[params.userId];
  }

  const verificationStatus: ProfileVerificationStatus =
    params.role === 'Admin' ? 'Verified' : 'Pending Verification';

  const user: PlatformUser = {
    id: params.userId,
    uid: params.userId,
    role: params.role,
    sponsorType: params.role === 'Sponsor' ? params.sponsorType || 'individual' : undefined,
    fullName: params.displayName,
    email: params.email,
    phone: '+234',
    country: 'Nigeria',
    state: 'Oyo State',
    lga: 'Ibadan North',
    townOrLocation: 'Ibadan',
    profilePicture: '',
    governmentIdDocument: `Dev Account (${params.accountCode})`,
    verificationStatus,
    accountCode: params.accountCode,
    mustChangePasswordOnFirstLogin: params.mustChangePasswordOnFirstLogin,
    status: 'Active',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  platformState.users[params.userId] = user;

  if (params.role === 'Worker' && !platformState.workerProfiles[params.userId]) {
    platformState.workerProfiles[params.userId] = {
      id: params.userId,
      userId: params.userId,
      fullName: params.displayName,
      email: params.email,
      phone: '+234',
      country: 'Nigeria',
      state: 'Oyo State',
      lga: 'Iseyin',
      townOrCity: 'Iseyin',
      residentialLocation: 'Iseyin, Oyo State',
      location: 'Iseyin, Oyo State',
      profilePicture: '',
      governmentIdDocument: `Pending ID (${params.accountCode})`,
      skills: ['Harvesting', 'Planting', 'Land preparation'],
      farmingExperience: 'Registered farm worker account',
      availableWorkTypes: ['Harvesting', 'Planting'],
      availability: 'Immediate',
      expectedWageNaira: 10000,
      wageUnit: 'Per Day / Task',
      bio: 'Available for seasonal farm tasks.',
      supportingDocuments: [],
      contactVisibility: 'Accepted Hirers Only',
      verificationStatus: 'Pending Verification',
      completedJobsCount: 0,
      status: 'Active',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  } else if (params.role === 'Farmer' && !platformState.farmerProfiles[params.userId]) {
    platformState.farmerProfiles[params.userId] = {
      id: params.userId,
      userId: params.userId,
      fullName: params.displayName,
      email: params.email,
      phone: '+234',
      country: 'Nigeria',
      state: 'Oyo State',
      lga: 'Iseyin',
      townOrFarmLocation: 'Iseyin Farm Corridor',
      profilePicture: '',
      governmentIdDocument: `Pending ID (${params.accountCode})`,
      farmName: `${params.displayName.split(' (')[0]} Farm`,
      farmLocation: 'Iseyin, Oyo State',
      farmingType: 'Arable Crop Farming',
      cropsOrLivestock: 'Maize & Cassava',
      farmSize: '5 Hectares',
      yearsOfExperience: '5 Years',
      farmDescription: 'Farmer account ready to submit real support requests or publish worker jobs.',
      agriculturalSupportNeeded: ['Seeds & Fertiliser', 'Agricultural Equipment'],
      farmPhotographs: [],
      supportingDocuments: [],
      verificationStatus: 'Pending Verification',
      status: 'Active',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  } else if (params.role === 'Supervisor' && !platformState.supervisorProfiles[params.userId]) {
    platformState.supervisorProfiles[params.userId] = {
      id: params.userId,
      userId: params.userId,
      fullName: params.displayName,
      email: params.email,
      phone: '+234',
      country: 'Nigeria',
      state: 'Oyo State',
      lga: 'Ibadan',
      residentialLocation: 'Ibadan, Oyo State',
      profilePicture: '',
      governmentIdDocument: `Pending ID (${params.accountCode})`,
      professionalQualifications: 'B.Sc. Agronomy & Field Monitoring',
      agriculturalExperience: '6 Years Field Supervision',
      specialisations: ['Crop production', 'Harvest supervision', 'Quality control'],
      previousSupervisionExperience: 'Monitored multi-hectare grain harvests and storage weigh-ins.',
      certifications: [],
      bio: 'Independent agricultural project monitor.',
      availabilityAndServiceLocations: 'Oyo & Ogun Corridors',
      verificationStatus: 'Pending Verification',
      status: 'Active',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  } else if (params.role === 'Sponsor') {
    const sType = params.sponsorType || 'individual';
    if (!platformState.sponsorProfiles[params.userId]) {
      platformState.sponsorProfiles[params.userId] = {
        id: params.userId,
        userId: params.userId,
        sponsorType: sType,
        fullName: params.displayName,
        email: params.email,
        phone: '+234',
        country: 'Nigeria',
        location: 'Lagos & Oyo State',
        profilePicture: '',
        governmentIdDocument: `Pending ID (${params.accountCode})`,
        description:
          sType === 'organisation'
            ? 'Registered agribusiness organisation sponsor.'
            : 'Registered individual agricultural sponsor.',
        agriculturalInterests: ['Arable Crops', 'Mechanisation'],
        supportTypesProvided: ['Financial Support', 'Seeds & Fertiliser'],
        organisationId: sType === 'organisation' ? `org_${params.userId}` : undefined,
        verificationStatus: 'Pending Verification',
        status: 'Active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }
    if (sType === 'organisation' && !platformState.organisations[params.userId]) {
      platformState.organisations[params.userId] = {
        id: `org_${params.userId}`,
        userId: params.userId,
        organisationName: params.displayName,
        officialEmail: params.email,
        phone: '+234',
        officeAddress: 'Ibadan, Oyo State',
        country: 'Nigeria',
        location: 'Ibadan, Oyo State',
        logoUrl: '',
        website: '',
        organisationType: 'Agribusiness Sponsor',
        representativeName: 'Primary Treasury Representative',
        representativePosition: 'Director of Agricultural Investments',
        representativeIdDocument: `Pending Rep ID (${params.accountCode})`,
        registrationDocuments: [],
        description: 'Corporate agricultural sponsor account.',
        agriculturalSupportCategories: ['Financial Support', 'Agricultural Equipment'],
        supportTypesAvailable: ['Financial Support', 'Seeds & Fertiliser', 'Equipment'],
        verificationStatus: 'Pending Verification',
        status: 'Active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }
  }

  savePlatformState();
  return user;
}

function buildRoleScopedSnapshot(userId: string, role: UserRole) {
  const user = platformState.users[userId] || null;
  const allUsers = Object.values(platformState.users);
  const workerProfiles = Object.values(platformState.workerProfiles);
  const farmerProfiles = Object.values(platformState.farmerProfiles);
  const supervisorProfiles = Object.values(platformState.supervisorProfiles);
  const sponsorProfiles = Object.values(platformState.sponsorProfiles);
  const organisations = Object.values(platformState.organisations);

  // Strict privacy & scoping guards per Section 6, 12, 13
  const supportAgreements =
    role === 'Admin'
      ? platformState.supportAgreements
      : role === 'Supervisor'
        ? platformState.supportAgreements.filter(
            (a) =>
              a.supervisionRequired &&
              a.status === 'Active Agreement' &&
              (a.assignedSupervisorId === userId ||
                platformState.supervisionRequests.some(
                  (r) =>
                    r.agreementId === a.id &&
                    r.invitedSupervisorId === userId &&
                    (r.status === 'Invited' || r.status === 'Accepted')
                ))
          )
        : platformState.supportAgreements.filter(
            (a) => a.farmerId === userId || a.sponsorId === userId
          );

  const workerAgreements =
    role === 'Admin'
      ? platformState.workerAgreements
      : role === 'Supervisor'
        ? platformState.workerAgreements.filter(
            (a) =>
              a.supervisionRequired &&
              a.status === 'Active Work' &&
              (a.assignedSupervisorId === userId ||
                platformState.supervisionRequests.some(
                  (r) =>
                    r.agreementId === a.id &&
                    r.invitedSupervisorId === userId &&
                    (r.status === 'Invited' || r.status === 'Accepted')
                ))
          )
        : platformState.workerAgreements.filter(
            (a) => a.farmerId === userId || a.hirerId === userId || a.workerId === userId
          );

  const assistanceRequests =
    role === 'Admin' || role === 'Sponsor'
      ? platformState.assistanceRequests
      : role === 'Farmer'
        ? platformState.assistanceRequests.filter((r) => r.farmerId === userId)
        : [];

  const sponsorOffers =
    role === 'Admin'
      ? platformState.sponsorOffers
      : platformState.sponsorOffers.filter(
          (o) => o.farmerId === userId || o.sponsorId === userId
        );

  const workerRequests =
    role === 'Worker' || role === 'Farmer' || role === 'Sponsor' || role === 'Admin'
      ? platformState.workerRequests
      : [];

  const workerApplications =
    role === 'Admin'
      ? platformState.workerApplications
      : role === 'Worker'
        ? platformState.workerApplications.filter((a) => a.workerId === userId)
        : platformState.workerApplications.filter(
            (a) => a.hirerId === userId || a.farmerId === userId
          );

  const workerPayments =
    role === 'Admin'
      ? platformState.workerPayments
      : role === 'Supervisor'
        ? platformState.workerPayments.filter((p) =>
            workerAgreements.some((wa) => wa.id === p.workerAgreementId)
          )
        : platformState.workerPayments.filter(
            (p) => p.farmerId === userId || p.hirerId === userId || p.workerId === userId
          );

  const supervisionRequests =
    role === 'Admin'
      ? platformState.supervisionRequests
      : role === 'Supervisor'
        ? platformState.supervisionRequests.filter((r) => r.invitedSupervisorId === userId)
        : platformState.supervisionRequests.filter(
            (r) =>
              r.requestedById === userId ||
              r.farmerId === userId ||
              r.sponsorId === userId ||
              r.workerId === userId
          );

  const supervisionAssignments =
    role === 'Admin'
      ? platformState.supervisionAssignments
      : role === 'Supervisor'
        ? platformState.supervisionAssignments.filter((a) => a.supervisorId === userId)
        : platformState.supervisionAssignments.filter(
            (a) =>
              a.farmerId === userId || a.sponsorId === userId || a.workerId === userId
          );

  const visibleAssignmentIds = new Set(supervisionAssignments.map((a) => a.id));
  const supervisionReports =
    role === 'Admin'
      ? platformState.supervisionReports
      : platformState.supervisionReports.filter(
          (rep) => rep.supervisorId === userId || visibleAssignmentIds.has(rep.assignmentId)
        );

  const conversations =
    role === 'Admin'
      ? platformState.conversations
      : platformState.conversations.filter((c) => c.participantIds.includes(userId));

  const messages =
    role === 'Admin'
      ? platformState.messages
      : platformState.messages.filter(
          (m) => m.senderId === userId || m.recipientId === userId
        );

  const notifications = platformState.notifications.filter((n) => n.userId === userId);
  const supportUpdates =
    role === 'Admin'
      ? platformState.supportUpdates
      : platformState.supportUpdates.filter((u) =>
          supportAgreements.some((a) => a.id === u.agreementId)
        );

  const acceptanceFees =
    role === 'Admin'
      ? platformState.acceptanceFees
      : platformState.acceptanceFees.filter(
          (f) => f.obligorId === userId || f.beneficiaryId === userId
        );

  return {
    user,
    users: role === 'Admin' ? allUsers : [],
    workerProfiles,
    farmerProfiles,
    supervisorProfiles,
    sponsorProfiles,
    organisations,
    assistanceRequests,
    sponsorOffers,
    workerRequests,
    workerApplications,
    supportAgreements,
    workerAgreements,
    workerPayments,
    supervisionRequests,
    supervisionAssignments,
    supervisionReports,
    conversations,
    messages,
    notifications,
    supportUpdates,
    acceptanceFees,
    verificationApplications:
      role === 'Admin'
        ? platformState.verificationApplications
        : platformState.verificationApplications.filter((v) => v.userId === userId),
    disputes:
      role === 'Admin'
        ? platformState.disputes
        : platformState.disputes.filter((d) => d.raisedById === userId),
    adminAuditLogs: role === 'Admin' ? platformState.adminAuditLogs.slice(0, 120) : [],
    platformSettings: platformState.platformSettings,
  };
}

export interface PlatformStellarHooks {
  onProvisionUserWallet?: (params: {
    userId: string;
    role: UserRole;
    sponsorType?: 'individual' | 'organisation';
    displayName: string;
  }) => void;
  onExecuteAcceptanceFeeSettlement?: (params: {
    action: 'LOCK' | 'REFUND' | 'FORFEIT';
    fee: AcceptanceFeeRecord;
  }) => Promise<{ transactionHash: string; onChain: boolean }>;
}

function createAcceptanceFeeRecordIfMissing(params: {
  obligorId: string;
  obligorName: string;
  obligorRole: 'Worker' | 'Farmer';
  beneficiaryId: string;
  beneficiaryName: string;
  agreementType: 'WorkerHiring' | 'SponsorSupport';
  agreementId: string;
  agreementTitle: string;
  agreedPrincipalNaira: number;
}): AcceptanceFeeRecord {
  const existing = platformState.acceptanceFees.find(
    (f) => f.agreementId === params.agreementId && f.obligorId === params.obligorId
  );
  if (existing) return existing;

  const calc = calculateAcceptanceFee({
    principalNaira: params.agreedPrincipalNaira,
    obligorRole: params.obligorRole,
  });
  const nowIso = new Date().toISOString();
  const record: AcceptanceFeeRecord = {
    id: `accfee_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    ownerId: params.obligorId,
    obligorId: params.obligorId,
    obligorName: params.obligorName,
    obligorRole: params.obligorRole,
    beneficiaryId: params.beneficiaryId,
    beneficiaryName: params.beneficiaryName,
    agreementType: params.agreementType,
    agreementId: params.agreementId,
    agreementTitle: params.agreementTitle,
    agreedPrincipalNaira: calc.agreedPrincipalNaira,
    feeAmountNaira: calc.feeAmountNaira,
    feeAmountUsdc: calc.feeAmountUsdc,
    assetCode: 'USDC',
    status: 'Pending Deposit',
    escrowReference: `FF-BOND-${params.agreementId.slice(-6).toUpperCase()}`,
    transactionHash: 'PENDING_DEPOSIT',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  platformState.acceptanceFees.unshift(record);
  pushNotification({
    userId: params.obligorId,
    title: `Acceptance Fee Required (${record.feeAmountUsdc.toFixed(2)} USDC)`,
    body: `Lock your refundable ${record.feeAmountUsdc.toFixed(2)} USDC (₦${record.feeAmountNaira.toLocaleString('en-NG')}) commitment bond for "${record.agreementTitle}". Returned 100% upon completion; protects against absconding.`,
    category: 'Acceptance Fee',
    relatedId: record.id,
  });
  return record;
}

export function registerPlatformRoutes(app: Express, hooks?: PlatformStellarHooks): void {
  // 1. Public Homepage Stats (strictly real counts only — never fabricated)
  app.get('/api/platform/public-summary', (_req: Request, res: Response) => {
    res.json({
      registeredWorkersCount: Object.keys(platformState.workerProfiles).length,
      registeredFarmersCount: Object.keys(platformState.farmerProfiles).length,
      registeredSupervisorsCount: Object.keys(platformState.supervisorProfiles).length,
      registeredSponsorsCount: Object.keys(platformState.sponsorProfiles).length,
      openJobsCount: platformState.workerRequests.filter((w) => w.status !== 'Closed').length,
      activeSupportAgreementsCount: platformState.supportAgreements.filter(
        (a) => a.status === 'Active Agreement'
      ).length,
    });
  });

  // 2. Role-Specific Registration (Worker, Farmer, Supervisor, Sponsor only — Admin forbidden)
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const payload = req.body as Partial<RegistrationPayload>;
    const validationErr = validateRegistrationPayload(payload);
    if (validationErr) {
      res.status(400).json({ error: validationErr });
      return;
    }

    const emailNormalized = (payload.email || '').trim().toLowerCase();
    if (platformState.credentials[emailNormalized]) {
      res.status(409).json({
        error: 'An account with this email address already exists. Please sign in instead.',
      });
      return;
    }

    const role = payload.role!;
    const sponsorType = role === 'Sponsor' ? payload.sponsorType || 'individual' : undefined;
    const nowIso = new Date().toISOString();
    const userId = `usr_${role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const displayName =
      role === 'Sponsor' && sponsorType === 'organisation'
        ? (payload.organisationName || '').trim()
        : (payload.fullName || '').trim();

    platformState.credentials[emailNormalized] = {
      userId,
      email: emailNormalized,
      passwordHash: hashUserPassword(payload.password!),
      role,
      createdAt: nowIso,
    };

    const userRecord: PlatformUser = {
      id: userId,
      uid: userId,
      role,
      sponsorType,
      fullName: displayName,
      email: emailNormalized,
      phone: (payload.phone || '').trim(),
      country: (payload.country || 'Nigeria').trim(),
      state: (payload.state || '').trim(),
      lga: (payload.lga || '').trim(),
      townOrLocation: (payload.townOrLocation || '').trim(),
      profilePicture: (payload.profilePicture || '').trim(),
      governmentIdDocument: (
        payload.governmentIdDocument ||
        payload.representativeIdDocument ||
        ''
      ).trim(),
      verificationStatus: 'Pending Verification',
      status: 'Active',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    platformState.users[userId] = userRecord;

    if (role === 'Worker') {
      platformState.workerProfiles[userId] = {
        id: userId,
        userId,
        fullName: displayName,
        email: emailNormalized,
        phone: userRecord.phone,
        country: userRecord.country,
        state: userRecord.state,
        lga: userRecord.lga,
        townOrCity: userRecord.townOrLocation,
        residentialLocation: userRecord.townOrLocation,
        location: `${userRecord.townOrLocation}, ${userRecord.state}`,
        profilePicture: userRecord.profilePicture,
        governmentIdDocument: userRecord.governmentIdDocument,
        skills: payload.skills || [],
        farmingExperience: (payload.farmingExperience || 'Experienced farm labour').trim(),
        availableWorkTypes: payload.availableWorkTypes || [],
        availability: (payload.availability || '').trim(),
        expectedWageNaira: Number(payload.expectedWageNaira) || 5000,
        wageUnit: payload.wageUnit || 'Per Day',
        bio: (payload.bio || '').trim(),
        supportingDocuments: payload.supportingDocuments || [],
        contactVisibility: 'Accepted Hirers Only',
        verificationStatus: 'Pending Verification',
        completedJobsCount: 0,
        status: 'Active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    } else if (role === 'Farmer') {
      platformState.farmerProfiles[userId] = {
        id: userId,
        userId,
        fullName: displayName,
        email: emailNormalized,
        phone: userRecord.phone,
        country: userRecord.country,
        state: userRecord.state,
        lga: userRecord.lga,
        townOrFarmLocation: userRecord.townOrLocation,
        profilePicture: userRecord.profilePicture,
        governmentIdDocument: userRecord.governmentIdDocument,
        farmName: (payload.farmName || '').trim(),
        farmLocation: (payload.farmLocation || userRecord.townOrLocation).trim(),
        farmingType: (payload.farmingType || '').trim(),
        cropsOrLivestock: (payload.cropsOrLivestock || '').trim(),
        farmSize: (payload.farmSize || '').trim(),
        yearsOfExperience: (payload.yearsOfExperience || '').trim(),
        farmDescription: (payload.farmDescription || '').trim(),
        agriculturalSupportNeeded: payload.agriculturalSupportNeeded || [],
        farmPhotographs: payload.farmPhotographs || [],
        supportingDocuments: payload.supportingDocuments || [],
        verificationStatus: 'Pending Verification',
        status: 'Active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    } else if (role === 'Supervisor') {
      platformState.supervisorProfiles[userId] = {
        id: userId,
        userId,
        fullName: displayName,
        email: emailNormalized,
        phone: userRecord.phone,
        country: userRecord.country,
        state: userRecord.state,
        lga: userRecord.lga,
        residentialLocation: userRecord.townOrLocation,
        profilePicture: userRecord.profilePicture,
        governmentIdDocument: userRecord.governmentIdDocument,
        professionalQualifications: (payload.professionalQualifications || '').trim(),
        agriculturalExperience: (payload.agriculturalExperience || '').trim(),
        specialisations: payload.specialisations || [],
        previousSupervisionExperience: (payload.previousSupervisionExperience || '').trim(),
        certifications: payload.certifications || [],
        bio: (payload.bio || '').trim(),
        availabilityAndServiceLocations: (payload.availabilityAndServiceLocations || '').trim(),
        verificationStatus: 'Pending Verification',
        status: 'Active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    } else if (role === 'Sponsor') {
      const orgId = sponsorType === 'organisation' ? `org_${userId}` : undefined;
      platformState.sponsorProfiles[userId] = {
        id: userId,
        userId,
        sponsorType: sponsorType!,
        fullName: displayName,
        email: emailNormalized,
        phone: userRecord.phone,
        country: userRecord.country,
        location: `${userRecord.townOrLocation}, ${userRecord.state || userRecord.country}`,
        profilePicture: (payload.logoUrl || payload.profilePicture || '').trim(),
        governmentIdDocument: (
          payload.representativeIdDocument ||
          payload.governmentIdDocument ||
          ''
        ).trim(),
        description: (payload.description || '').trim(),
        agriculturalInterests:
          payload.agriculturalInterests || payload.agriculturalSupportCategories || [],
        supportTypesProvided: payload.supportTypesProvided || [],
        socialMediaLinks: payload.socialMediaLinks || '',
        organisationId: orgId,
        verificationStatus: 'Pending Verification',
        status: 'Active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (sponsorType === 'organisation' && orgId) {
        platformState.organisations[userId] = {
          id: orgId,
          userId,
          organisationName: (payload.organisationName || displayName).trim(),
          officialEmail: emailNormalized,
          phone: userRecord.phone,
          officeAddress: (payload.officeAddress || '').trim(),
          country: userRecord.country,
          location: userRecord.townOrLocation,
          logoUrl: (payload.logoUrl || '').trim(),
          website: (payload.website || '').trim(),
          organisationType: (payload.organisationType || '').trim(),
          representativeName: (payload.representativeName || '').trim(),
          representativePosition: (payload.representativePosition || '').trim(),
          representativeIdDocument: (payload.representativeIdDocument || '').trim(),
          registrationDocuments: payload.registrationDocuments || [],
          description: (payload.description || '').trim(),
          agriculturalSupportCategories: payload.agriculturalSupportCategories || [],
          supportTypesAvailable: payload.supportTypesProvided || [],
          verificationStatus: 'Pending Verification',
          status: 'Active',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
      }
    }

    const verApp: VerificationApplication = {
      id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      userId,
      role,
      applicantName: displayName,
      applicantEmail: emailNormalized,
      governmentIdDocument: userRecord.governmentIdDocument,
      supportingDocuments:
        payload.registrationDocuments ||
        payload.supportingDocuments ||
        payload.certifications ||
        [],
      status: 'Pending Verification',
      submittedAt: nowIso,
      updatedAt: nowIso,
    };
    platformState.verificationApplications.unshift(verApp);

    pushNotification({
      userId,
      title: 'Registration Received — Pending Verification',
      body: `Welcome to FarmFund, ${displayName}. Your ${role} profile is saved with status Pending Verification until an authorised reviewer approves your identity documents.`,
      category: 'Verification',
      relatedId: verApp.id,
    });

    pushAdminAudit({
      actorId: userId,
      actorName: displayName,
      actorRole: role,
      action: 'USER_REGISTERED',
      targetCollection: 'users',
      targetId: userId,
      summary: `New ${role}${sponsorType ? ` (${sponsorType})` : ''} registered with status Pending Verification.`,
    });

    hooks?.onProvisionUserWallet?.({
      userId,
      role,
      sponsorType,
      displayName,
    });

    savePlatformState();
    res.status(201).json({
      user: userRecord,
      snapshot: buildRoleScopedSnapshot(userId, role),
    });
  });

  // 3. Standard Email + Password Sign In (Admin & All 4 Public Roles)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    const cred = platformState.credentials[cleanEmail];
    if (!cred) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    if (hashUserPassword(password || '') !== cred.passwordHash) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    const user = platformState.users[cred.userId];
    if (!user) {
      res.status(404).json({ error: 'User profile record not found.' });
      return;
    }

    res.json({
      user,
      snapshot: buildRoleScopedSnapshot(user.id, user.role),
    });
  });

  // 3b. Firebase Google Sign-In Sync (preserves existing role; assigns selected public role on first login)
  app.post('/api/auth/google-sync', (req: Request, res: Response) => {
    const { uid, email, displayName, role } = req.body as {
      uid?: string;
      email?: string;
      displayName?: string;
      role?: UserRole;
    };
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!uid || !cleanEmail) {
      res.status(400).json({ error: 'Valid Firebase Google account UID and email are required.' });
      return;
    }

    const existingCred = platformState.credentials[cleanEmail];
    if (existingCred && platformState.users[existingCred.userId]) {
      const existingUser = platformState.users[existingCred.userId];
      res.json({
        user: existingUser,
        snapshot: buildRoleScopedSnapshot(existingUser.id, existingUser.role),
      });
      return;
    }

    if (platformState.users[uid]) {
      const existingUser = platformState.users[uid];
      res.json({
        user: existingUser,
        snapshot: buildRoleScopedSnapshot(existingUser.id, existingUser.role),
      });
      return;
    }

    const assignedRole: UserRole =
      role === 'Worker' || role === 'Farmer' || role === 'Supervisor' || role === 'Sponsor'
        ? role
        : 'Farmer';

    const syncedUser = ensureDevUserRecord({
      userId: uid.replace(/[^a-zA-Z0-9_-]/g, '_'),
      role: assignedRole,
      sponsorType: assignedRole === 'Sponsor' ? 'individual' : undefined,
      displayName: (displayName || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      accountCode: `GOOG_${assignedRole.slice(0, 3).toUpperCase()}`,
      mustChangePasswordOnFirstLogin: false,
    });

    platformState.credentials[cleanEmail] = {
      userId: syncedUser.id,
      email: cleanEmail,
      passwordHash: hashUserPassword(`google-oauth-${uid}`),
      role: syncedUser.role,
      createdAt: syncedUser.createdAt,
    };
    savePlatformState();

    res.status(201).json({
      user: syncedUser,
      snapshot: buildRoleScopedSnapshot(syncedUser.id, syncedUser.role),
    });
  });

  // 4. Hydrate Role-Scoped Workspace State
  app.get('/api/platform/state', (req: Request, res: Response) => {
    const userId = String(req.query.userId || '').trim();
    if (!userId || !platformState.users[userId]) {
      res.status(404).json({ error: 'Authenticated user session not found.' });
      return;
    }
    const user = platformState.users[userId];
    res.json({
      user,
      snapshot: buildRoleScopedSnapshot(userId, user.role),
    });
  });

  // 5. Role-Locked Profile Editing (blocks role change & self-verification; re-triggers Pending Verification on identity edits)
  app.put('/api/profiles/:userId', (req: Request, res: Response) => {
    const { userId } = req.params;
    const body = req.body as {
      actorId?: string;
      attemptedRole?: UserRole;
      attemptedVerificationStatus?: ProfileVerificationStatus;
      profilePatch?: Record<string, unknown>;
      organisationPatch?: Record<string, unknown>;
    };

    const targetUser = platformState.users[userId];
    const actorUser = platformState.users[body.actorId || userId];
    if (!targetUser || !actorUser) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const patch = body.profilePatch || {};
    const editedIdentity = Boolean(
      (typeof patch.fullName === 'string' && patch.fullName.trim() !== targetUser.fullName) ||
        (typeof patch.governmentIdDocument === 'string' &&
          patch.governmentIdDocument.trim() !== targetUser.governmentIdDocument) ||
        (typeof patch.organisationName === 'string' && patch.organisationName.trim() !== '')
    );

    const perm = evaluateProfileUpdatePermissions({
      actorUser,
      targetUserId: userId,
      attemptedRoleChange: body.attemptedRole,
      attemptedStatusChange: body.attemptedVerificationStatus,
      editedVerifiedIdentityFields: editedIdentity,
    });

    if (!perm.allowed) {
      res.status(403).json({ error: perm.error || 'Profile update denied.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const safeVerificationStatus = perm.nextVerificationStatus;
    targetUser.verificationStatus = safeVerificationStatus;
    if (typeof patch.fullName === 'string' && patch.fullName.trim()) {
      targetUser.fullName = patch.fullName.trim();
    }
    if (typeof patch.phone === 'string') targetUser.phone = patch.phone.trim();
    if (typeof patch.country === 'string') targetUser.country = patch.country.trim();
    if (typeof patch.state === 'string') targetUser.state = patch.state.trim();
    if (typeof patch.lga === 'string') targetUser.lga = patch.lga.trim();
    if (typeof patch.townOrLocation === 'string') {
      targetUser.townOrLocation = patch.townOrLocation.trim();
    }
    if (typeof patch.profilePicture === 'string') {
      targetUser.profilePicture = patch.profilePicture.trim();
    }
    if (typeof patch.governmentIdDocument === 'string' && patch.governmentIdDocument.trim()) {
      targetUser.governmentIdDocument = patch.governmentIdDocument.trim();
    }
    targetUser.updatedAt = nowIso;

    // Strip disallowed escalation keys from client patch
    const {
      role: _ignoreRole,
      verificationStatus: _ignoreVer,
      id: _ignoreId,
      userId: _ignoreUid,
      ...cleanPatch
    } = patch;

    if (targetUser.role === 'Worker' && platformState.workerProfiles[userId]) {
      platformState.workerProfiles[userId] = {
        ...platformState.workerProfiles[userId],
        ...cleanPatch,
        verificationStatus: safeVerificationStatus,
        updatedAt: nowIso,
      } as WorkerProfile;
    } else if (targetUser.role === 'Farmer' && platformState.farmerProfiles[userId]) {
      platformState.farmerProfiles[userId] = {
        ...platformState.farmerProfiles[userId],
        ...cleanPatch,
        verificationStatus: safeVerificationStatus,
        updatedAt: nowIso,
      } as FarmerProfile;
    } else if (targetUser.role === 'Supervisor' && platformState.supervisorProfiles[userId]) {
      platformState.supervisorProfiles[userId] = {
        ...platformState.supervisorProfiles[userId],
        ...cleanPatch,
        verificationStatus: safeVerificationStatus,
        updatedAt: nowIso,
      } as SupervisorProfile;
    } else if (targetUser.role === 'Sponsor' && platformState.sponsorProfiles[userId]) {
      platformState.sponsorProfiles[userId] = {
        ...platformState.sponsorProfiles[userId],
        ...cleanPatch,
        verificationStatus: safeVerificationStatus,
        updatedAt: nowIso,
      } as SponsorProfile;
      if (body.organisationPatch && platformState.organisations[userId]) {
        const {
          verificationStatus: _ignoreOrgVer,
          userId: _ignoreOrgUid,
          id: _ignoreOrgId,
          ...cleanOrgPatch
        } = body.organisationPatch;
        platformState.organisations[userId] = {
          ...platformState.organisations[userId],
          ...cleanOrgPatch,
          verificationStatus: safeVerificationStatus,
          updatedAt: nowIso,
        } as OrganisationProfile;
      }
    }

    if (editedIdentity && safeVerificationStatus === 'Pending Verification') {
      platformState.verificationApplications.unshift({
        id: `ver_recheck_${Date.now()}`,
        userId,
        role: targetUser.role,
        applicantName: targetUser.fullName,
        applicantEmail: targetUser.email,
        governmentIdDocument: targetUser.governmentIdDocument,
        supportingDocuments: [],
        status: 'Pending Verification',
        reviewerNotes: 'Re-queued automatically after identity details update.',
        submittedAt: nowIso,
        updatedAt: nowIso,
      });
    }

    savePlatformState();
    res.json({
      user: targetUser,
      reverificationTriggered:
        editedIdentity && safeVerificationStatus === 'Pending Verification',
      snapshot: buildRoleScopedSnapshot(userId, targetUser.role),
    });
  });

  // 6. Farmer -> Sponsor Assistance Requests
  app.post('/api/assistance-requests', (req: Request, res: Response) => {
    const body = req.body as Partial<SupportRequest> & { farmerId?: string };
    const farmer = body.farmerId ? platformState.users[body.farmerId] : undefined;
    if (!farmer || farmer.role !== 'Farmer') {
      res.status(403).json({ error: 'Only registered Farmer accounts may submit Farm Support Requests.' });
      return;
    }

    const validationErr = validateSupportRequestDraft(body);
    if (validationErr) {
      res.status(400).json({ error: validationErr });
      return;
    }

    const nowIso = new Date().toISOString();
    const newReq: SupportRequest = {
      id: `areq_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ownerId: farmer.id,
      farmerId: farmer.id,
      farmerName: farmer.fullName,
      targetSponsorId: body.targetSponsorId,
      targetSponsorName: body.targetSponsorName,
      title: body.title!.trim(),
      farmName: body.farmName!.trim(),
      farmingType: body.farmingType!.trim(),
      cropOrProduceType: body.cropOrProduceType!.trim(),
      location: body.location!.trim(),
      farmSize: body.farmSize!.trim(),
      description: body.description!.trim(),
      assistanceType: body.assistanceType || 'Financial Support',
      fundingAmount: Number(body.fundingAmount) || 0,
      materialsOrEquipment: (body.materialsOrEquipment || '').trim(),
      farmingPeriod: body.farmingPeriod!.trim(),
      expectedHarvestDate: body.expectedHarvestDate!.trim(),
      estimatedOutput: body.estimatedOutput!.trim(),
      preferredShareModel: body.preferredShareModel || 'None (Standard Support)',
      explicitlyAgreedThirtyPercent:
        body.preferredShareModel !== 'None (Standard Support)' &&
        Boolean(body.acknowledgedThirtyPercentNotice),
      acknowledgedThirtyPercentNotice: Boolean(body.acknowledgedThirtyPercentNotice),
      photographs: body.photographs || [],
      supportingDocuments: body.supportingDocuments || [],
      status: 'Open',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    platformState.assistanceRequests.unshift(newReq);
    if (newReq.targetSponsorId) {
      pushNotification({
        userId: newReq.targetSponsorId,
        title: `New Farm Support Request from ${farmer.fullName}`,
        body: `"${newReq.title}" (${newReq.assistanceType}) is ready for your review.`,
        category: 'Support Request',
        relatedId: newReq.id,
      });
    }
    savePlatformState();
    res.status(201).json({
      request: newReq,
      snapshot: buildRoleScopedSnapshot(farmer.id, farmer.role),
    });
  });

  // Sponsor -> Farmer Support Offer
  app.post('/api/sponsor-offers', (req: Request, res: Response) => {
    const body = req.body as Partial<SponsorOffer>;
    const sponsor = body.sponsorId ? platformState.users[body.sponsorId] : undefined;
    const farmer = body.farmerId ? platformState.users[body.farmerId] : undefined;
    if (!sponsor || sponsor.role !== 'Sponsor' || !farmer || farmer.role !== 'Farmer') {
      res.status(403).json({ error: 'Valid Sponsor and Farmer accounts are required.' });
      return;
    }

    if (!body.title?.trim() || !body.fundingOrMaterialContribution?.trim()) {
      res.status(400).json({ error: 'Offer title and contribution description are required.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const offer: SponsorOffer = {
      id: `sofr_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ownerId: sponsor.id,
      sponsorId: sponsor.id,
      sponsorName: sponsor.fullName,
      sponsorType: sponsor.sponsorType || 'individual',
      farmerId: farmer.id,
      farmerName: farmer.fullName,
      title: body.title.trim(),
      supportCategory: body.supportCategory || 'Financial Support',
      fundingOrMaterialContribution: body.fundingOrMaterialContribution.trim(),
      contributionValueNaira: Number(body.contributionValueNaira) || 0,
      proposedConditions: (body.proposedConditions || 'Standard mutual review and transparent harvest record.').trim(),
      usesThirtyPercentShare: Boolean(body.usesThirtyPercentShare),
      shareType: body.usesThirtyPercentShare
        ? body.shareType || '30% Farm Produce Share'
        : 'None (Standard Support)',
      supervisionRecommended: Boolean(body.supervisionRecommended),
      status: 'Sent',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    platformState.sponsorOffers.unshift(offer);
    pushNotification({
      userId: farmer.id,
      title: `New Sponsor Offer from ${sponsor.fullName}`,
      body: `"${offer.title}" — review terms and respond in your Farmer Dashboard.`,
      category: 'Support Request',
      relatedId: offer.id,
    });
    savePlatformState();
    res.status(201).json({
      offer,
      snapshot: buildRoleScopedSnapshot(sponsor.id, sponsor.role),
    });
  });

  // Sponsor or Farmer responds to request / offer / creates mutual agreement
  app.post('/api/assistance-requests/:requestId/respond', (req: Request, res: Response) => {
    const { requestId } = req.params;
    const { actorId, action, note, supervisionRequired } = req.body as {
      actorId: string;
      action: 'ACCEPT_AND_DRAFT_AGREEMENT' | 'DECLINE' | 'REQUEST_INFO';
      note?: string;
      supervisionRequired?: boolean;
    };

    const actor = platformState.users[actorId];
    const targetReq = platformState.assistanceRequests.find((r) => r.id === requestId);
    if (!actor || actor.role !== 'Sponsor' || !targetReq) {
      res.status(403).json({ error: 'Authorised Sponsor and valid support request required.' });
      return;
    }

    const nowIso = new Date().toISOString();
    targetReq.updatedAt = nowIso;
    if (note) targetReq.sponsorReviewNote = note.trim();

    if (action === 'DECLINE') {
      targetReq.status = 'Declined';
      pushNotification({
        userId: targetReq.farmerId,
        title: `Request Declined: ${targetReq.title}`,
        body: note?.trim() || `${actor.fullName} declined this support request.`,
        category: 'Support Request',
        relatedId: targetReq.id,
      });
      savePlatformState();
      res.json({ request: targetReq, snapshot: buildRoleScopedSnapshot(actor.id, actor.role) });
      return;
    }

    if (action === 'REQUEST_INFO') {
      targetReq.status = 'More Information Requested';
      pushNotification({
        userId: targetReq.farmerId,
        title: `More Info Requested: ${targetReq.title}`,
        body: note?.trim() || `${actor.fullName} requested clarification on your farm request.`,
        category: 'Support Request',
        relatedId: targetReq.id,
      });
      savePlatformState();
      res.json({ request: targetReq, snapshot: buildRoleScopedSnapshot(actor.id, actor.role) });
      return;
    }

    // Create SponsorFundingAgreement awaiting dual acceptance
    targetReq.status = 'Agreement Pending';
    const usesThirty = targetReq.preferredShareModel !== 'None (Standard Support)';
    const newAgreement: SponsorFundingAgreement = {
      id: `sagr_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ownerId: actor.id,
      requestId: targetReq.id,
      requestTitle: targetReq.title,
      farmerId: targetReq.farmerId,
      farmerName: targetReq.farmerName,
      sponsorId: actor.id,
      sponsorName: actor.fullName,
      location: targetReq.location,
      sponsorContribution:
        targetReq.fundingAmount > 0
          ? `₦${targetReq.fundingAmount.toLocaleString('en-NG')}${targetReq.materialsOrEquipment ? ` + ${targetReq.materialsOrEquipment}` : ''}`
          : targetReq.materialsOrEquipment || targetReq.assistanceType,
      contributionValueNaira: targetReq.fundingAmount || 0,
      usesThirtyPercentShare: usesThirty,
      sharePercentage: usesThirty ? 30 : 0,
      shareType: targetReq.preferredShareModel,
      calculationMethod: usesThirty
        ? targetReq.preferredShareModel === '30% Farm Produce Share'
          ? `30% of verified eligible ${targetReq.cropOrProduceType} produce measured at farmgate.`
          : `30% of verified eligible net farm proceeds from ${targetReq.cropOrProduceType} harvest sales.`
        : 'Standard agreed support fulfilment without automatic 30% harvest share.',
      entitlementTiming: 'Upon verified harvest completion and joint reconciliation.',
      measurementVerification: 'Joint weighbridge scale tallies and signed harvest documentation.',
      lossOrPoorHarvestClause:
        'Subject to documented force majeure or weather loss; no unfair debt penalty on verified crop failure.',
      additionalConditions: note?.trim() || 'Progress photos and milestone updates shared in FarmFund.',
      expectedStartDate: nowIso.slice(0, 10),
      expectedCompletionDate: targetReq.expectedHarvestDate,
      supervisionRequired: Boolean(supervisionRequired),
      farmerAccepted: false,
      farmerAcceptedAt: '',
      sponsorAccepted: true,
      sponsorAcceptedAt: nowIso,
      status: 'Pending Acceptance',
      historyLog: [
        `${nowIso.slice(0, 10)}: Sponsor (${actor.fullName}) approved request & accepted draft agreement; awaiting Farmer explicit acceptance.`,
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    platformState.supportAgreements.unshift(newAgreement);
    pushNotification({
      userId: targetReq.farmerId,
      title: `Sponsor Ready to Support "${targetReq.title}"`,
      body: `${actor.fullName} reviewed your request. Review and accept the agreement terms in your Farmer Dashboard.`,
      category: 'Agreement',
      relatedId: newAgreement.id,
    });
    savePlatformState();
    res.status(201).json({
      request: targetReq,
      agreement: newAgreement,
      snapshot: buildRoleScopedSnapshot(actor.id, actor.role),
    });
  });

  // Farmer responds to Sponsor Offer (accept creates mutual Agreement)
  app.post('/api/sponsor-offers/:offerId/respond', (req: Request, res: Response) => {
    const { offerId } = req.params;
    const { actorId, decision, note } = req.body as {
      actorId: string;
      decision: 'ACCEPT' | 'DECLINE' | 'REQUEST_INFO';
      note?: string;
    };
    const farmer = platformState.users[actorId];
    const offer = platformState.sponsorOffers.find((o) => o.id === offerId);
    if (!farmer || farmer.role !== 'Farmer' || !offer || offer.farmerId !== farmer.id) {
      res.status(403).json({ error: 'Authorised Farmer recipient required.' });
      return;
    }

    const nowIso = new Date().toISOString();
    offer.updatedAt = nowIso;
    if (note) offer.farmerResponseNote = note.trim();

    if (decision === 'DECLINE') {
      offer.status = 'Declined by Farmer';
      savePlatformState();
      res.json({ offer, snapshot: buildRoleScopedSnapshot(farmer.id, farmer.role) });
      return;
    }
    if (decision === 'REQUEST_INFO') {
      offer.status = 'More Information Requested';
      savePlatformState();
      res.json({ offer, snapshot: buildRoleScopedSnapshot(farmer.id, farmer.role) });
      return;
    }

    offer.status = 'Accepted by Farmer';
    const agreement: SponsorFundingAgreement = {
      id: `sagr_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ownerId: offer.sponsorId,
      requestId: `offer_${offer.id}`,
      offerId: offer.id,
      requestTitle: offer.title,
      farmerId: farmer.id,
      farmerName: farmer.fullName,
      sponsorId: offer.sponsorId,
      sponsorName: offer.sponsorName,
      location: platformState.farmerProfiles[farmer.id]?.farmLocation || farmer.townOrLocation,
      sponsorContribution: offer.fundingOrMaterialContribution,
      contributionValueNaira: offer.contributionValueNaira,
      usesThirtyPercentShare: offer.usesThirtyPercentShare,
      sharePercentage: offer.usesThirtyPercentShare ? 30 : 0,
      shareType: offer.shareType,
      calculationMethod: offer.usesThirtyPercentShare
        ? `Explicitly agreed ${offer.shareType} on verified eligible output/proceeds.`
        : offer.proposedConditions,
      entitlementTiming: 'Upon verified harvest completion.',
      measurementVerification: 'Joint weighing & signed harvest audit.',
      lossOrPoorHarvestClause: 'Pro-rata adjustments on verified force majeure crop loss.',
      additionalConditions: offer.proposedConditions,
      supervisionRequired: offer.supervisionRecommended,
      farmerAccepted: true,
      farmerAcceptedAt: nowIso,
      sponsorAccepted: true,
      sponsorAcceptedAt: nowIso,
      status: 'Active Agreement',
      historyLog: [
        `${nowIso.slice(0, 10)}: Offer sent by ${offer.sponsorName} and accepted by ${farmer.fullName}. Agreement Active.`,
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    platformState.supportAgreements.unshift(agreement);
    const farmerAcceptanceFee = createAcceptanceFeeRecordIfMissing({
      obligorId: farmer.id,
      obligorName: farmer.fullName,
      obligorRole: 'Farmer',
      beneficiaryId: offer.sponsorId,
      beneficiaryName: offer.sponsorName,
      agreementType: 'SponsorSupport',
      agreementId: agreement.id,
      agreementTitle: agreement.requestTitle,
      agreedPrincipalNaira: agreement.contributionValueNaira || 100000,
    });
    pushNotification({
      userId: offer.sponsorId,
      title: `Support Offer Accepted by ${farmer.fullName}`,
      body: `"${offer.title}" is now an Active Support Agreement. Farmer Acceptance Fee (${farmerAcceptanceFee.feeAmountUsdc.toFixed(2)} USDC) generated.`,
      category: 'Agreement',
      relatedId: agreement.id,
    });
    savePlatformState();
    res.json({
      offer,
      agreement,
      acceptanceFee: farmerAcceptanceFee,
      snapshot: buildRoleScopedSnapshot(farmer.id, farmer.role),
    });
  });

  // Accept/Review Support Agreement (immutable once both accept; prevents unilateral edits)
  app.post('/api/agreements/support/:agreementId/accept', (req: Request, res: Response) => {
    const { agreementId } = req.params;
    const { actorId } = req.body as { actorId: string };
    const actor = platformState.users[actorId];
    const agr = platformState.supportAgreements.find((a) => a.id === agreementId);
    if (!actor || !agr) {
      res.status(404).json({ error: 'Support agreement or user not found.' });
      return;
    }

    if (agr.status === 'Active Agreement' || agr.status === 'Completed') {
      res.status(409).json({
        error: 'Agreement is already accepted and locked. Parties cannot unilaterally modify an accepted agreement.',
      });
      return;
    }

    const party =
      actor.id === agr.farmerId ? 'Farmer' : actor.id === agr.sponsorId ? 'Sponsor' : null;
    if (!party) {
      res.status(403).json({ error: 'Only the Farmer or Sponsor on this agreement may accept it.' });
      return;
    }

    const updated = acceptSponsorAgreementParty(agr, party, new Date().toISOString());
    const idx = platformState.supportAgreements.findIndex((a) => a.id === agreementId);
    platformState.supportAgreements[idx] = updated;

    if (updated.status === 'Active Agreement') {
      const parentReq = platformState.assistanceRequests.find((r) => r.id === updated.requestId);
      if (parentReq) {
        parentReq.status = 'Active Support';
        parentReq.updatedAt = updated.updatedAt;
      }
      createAcceptanceFeeRecordIfMissing({
        obligorId: updated.farmerId,
        obligorName: updated.farmerName,
        obligorRole: 'Farmer',
        beneficiaryId: updated.sponsorId,
        beneficiaryName: updated.sponsorName,
        agreementType: 'SponsorSupport',
        agreementId: updated.id,
        agreementTitle: updated.requestTitle,
        agreedPrincipalNaira: updated.contributionValueNaira || 100000,
      });
      pushNotification({
        userId: party === 'Farmer' ? updated.sponsorId : updated.farmerId,
        title: `Agreement Activated: ${updated.requestTitle}`,
        body: 'Both Farmer and Sponsor have explicitly accepted this agreement. Anti-absconding Acceptance Fee created for Farmer.',
        category: 'Agreement',
        relatedId: updated.id,
      });
    }

    savePlatformState();
    res.json({
      agreement: updated,
      snapshot: buildRoleScopedSnapshot(actor.id, actor.role),
    });
  });

  // Mark an Active Support Agreement as Completed and auto-refund locked Farmer Acceptance Fee
  app.post('/api/agreements/support/:agreementId/complete', async (req: Request, res: Response) => {
    const { agreementId } = req.params;
    const { actorId, notes } = req.body as { actorId: string; notes?: string };
    const actor = platformState.users[actorId];
    const agr = platformState.supportAgreements.find((a) => a.id === agreementId);
    if (!actor || !agr || (actor.id !== agr.sponsorId && actor.role !== 'Admin')) {
      res.status(403).json({
        error: 'Only the agreement Sponsor or an authorised Admin can mark a support agreement completed.',
      });
      return;
    }
    if (agr.status === 'Completed') {
      res.status(409).json({ error: 'Support agreement is already marked Completed.' });
      return;
    }

    const nowIso = new Date().toISOString();
    agr.status = 'Completed';
    agr.updatedAt = nowIso;
    agr.historyLog.push(
      `${nowIso.slice(0, 10)}: ${actor.fullName} verified fulfilment & marked support agreement Completed.${notes ? ` Note: ${notes}` : ''}`
    );

    const parentReq = platformState.assistanceRequests.find((r) => r.id === agr.requestId);
    if (parentReq) {
      parentReq.status = 'Completed';
      parentReq.updatedAt = nowIso;
    }

    const feeIdx = platformState.acceptanceFees.findIndex(
      (f) => f.agreementId === agr.id && f.status === 'Locked in Escrow'
    );
    if (feeIdx !== -1) {
      let settlementHash = 'COMPLETED_REFUND';
      if (hooks?.onExecuteAcceptanceFeeSettlement) {
        const resSettle = await hooks.onExecuteAcceptanceFeeSettlement({
          action: 'REFUND',
          fee: platformState.acceptanceFees[feeIdx],
        });
        settlementHash = resSettle.transactionHash;
      }
      const evalRefund = evaluateAcceptanceFeeTransition({
        record: platformState.acceptanceFees[feeIdx],
        action: 'REFUND_ON_COMPLETION',
        actorId: actor.id,
        actorRole: actor.role,
        timestampIso: nowIso,
        settlementHash,
      });
      if (evalRefund.allowed) {
        platformState.acceptanceFees[feeIdx] = evalRefund.nextRecord;
        pushNotification({
          userId: evalRefund.nextRecord.obligorId,
          title: `Acceptance Fee Refunded (${evalRefund.nextRecord.feeAmountUsdc.toFixed(2)} USDC)`,
          body: `Support agreement "${agr.requestTitle}" completed cleanly. Your acceptance fee has been released back to you.`,
          category: 'Acceptance Fee',
          relatedId: evalRefund.nextRecord.id,
        });
      }
    }

    pushNotification({
      userId: agr.farmerId,
      title: `Support Agreement Completed: ${agr.requestTitle}`,
      body: `${actor.fullName} marked the support agreement Completed.`,
      category: 'Agreement',
      relatedId: agr.id,
    });

    savePlatformState();
    res.json({ agreement: agr, snapshot: buildRoleScopedSnapshot(actor.id, actor.role) });
  });

  // Toggle supervision flag on an Active Support Agreement (only before lock or mutually authorised)
  app.post('/api/agreements/support/:agreementId/supervision-flag', (req: Request, res: Response) => {
    const { agreementId } = req.params;
    const { actorId, supervisionRequired } = req.body as {
      actorId: string;
      supervisionRequired: boolean;
    };
    const actor = platformState.users[actorId];
    const agr = platformState.supportAgreements.find((a) => a.id === agreementId);
    if (!actor || !agr || (actor.id !== agr.farmerId && actor.id !== agr.sponsorId)) {
      res.status(403).json({ error: 'Authorised Farmer or Sponsor party required.' });
      return;
    }
    agr.supervisionRequired = Boolean(supervisionRequired);
    agr.updatedAt = new Date().toISOString();
    agr.historyLog.push(
      `${agr.updatedAt.slice(0, 10)}: ${actor.fullName} updated supervision requirement to ${agr.supervisionRequired ? 'Required' : 'Not Required'}.`
    );
    savePlatformState();
    res.json({ agreement: agr, snapshot: buildRoleScopedSnapshot(actor.id, actor.role) });
  });

  // 7. Worker Jobs & Hiring Workflows (Farmer or Sponsor hires Worker; Workers CANNOT create jobs)
  app.post('/api/worker-requests', (req: Request, res: Response) => {
    const body = req.body as Partial<WorkerRequest> & { actorId?: string };
    const hirer = platformState.users[body.actorId || body.hirerId || body.farmerId || ''];
    if (!hirer || (hirer.role !== 'Farmer' && hirer.role !== 'Sponsor')) {
      res.status(403).json({
        error: 'Only registered Farmers or Sponsors may publish farm worker jobs. Workers cannot create jobs.',
      });
      return;
    }

    const validationErr = validateWorkerRequestDraft(body);
    if (validationErr) {
      res.status(400).json({ error: validationErr });
      return;
    }

    const nowIso = new Date().toISOString();
    const newJob: WorkerRequest = {
      id: `wreq_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ownerId: hirer.id,
      hirerId: hirer.id,
      hirerRole: hirer.role,
      hirerName: hirer.fullName,
      farmerId: hirer.id,
      farmerName: hirer.fullName,
      farmName: (body.farmName || `${hirer.fullName} Operations`).trim(),
      jobTitle: body.jobTitle!.trim(),
      workCategory: body.workCategory!.trim(),
      customWorkCategory: (body.customWorkCategory || '').trim(),
      description: body.description!.trim(),
      location: body.location!.trim(),
      workersNeeded: Math.max(1, Number(body.workersNeeded) || 1),
      workersHired: 0,
      requiredSkills: body.requiredSkills!.trim(),
      startDate: body.startDate!.trim(),
      expectedDuration: body.expectedDuration!.trim(),
      workingHours: body.workingHours!.trim(),
      paymentAmountNaira: Number(body.paymentAmountNaira) || 0,
      paymentBasis: body.paymentBasis || 'Per Worker (Total Task)',
      paymentMethod: body.paymentMethod!.trim(),
      accommodationOrFeeding: (body.accommodationOrFeeding || 'Standard day arrangement').trim(),
      contactInstructions: (body.contactInstructions || 'Use FarmFund Messages').trim(),
      photographs: body.photographs || [],
      acknowledgedWageRule: Boolean(body.acknowledgedWageRule),
      supervisionRequired: Boolean(body.supervisionRequired),
      status: 'Open',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    platformState.workerRequests.unshift(newJob);
    savePlatformState();
    res.status(201).json({
      workerRequest: newJob,
      snapshot: buildRoleScopedSnapshot(hirer.id, hirer.role),
    });
  });

  // Worker Applies for a Job
  app.post('/api/worker-applications', (req: Request, res: Response) => {
    const { workerId, workerRequestId, proposedWageNaira, message } = req.body as {
      workerId: string;
      workerRequestId: string;
      proposedWageNaira?: number;
      message?: string;
    };

    const workerUser = platformState.users[workerId];
    const workerProfile = platformState.workerProfiles[workerId];
    const job = platformState.workerRequests.find((j) => j.id === workerRequestId);

    if (!workerUser || workerUser.role !== 'Worker' || !job) {
      res.status(403).json({
        error: 'Only registered Worker accounts can apply for published farm jobs.',
      });
      return;
    }

    const alreadyApplied = platformState.workerApplications.some(
      (a) =>
        a.workerRequestId === workerRequestId &&
        a.workerId === workerId &&
        a.status !== 'Withdrawn'
    );
    if (alreadyApplied) {
      res.status(409).json({ error: 'You have already applied for this farm job.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const appRecord: WorkerApplication = {
      id: `wapp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ownerId: workerId,
      workerRequestId: job.id,
      jobTitle: job.jobTitle,
      workCategory: job.workCategory,
      location: job.location,
      hirerId: job.hirerId,
      hirerRole: job.hirerRole,
      hirerName: job.hirerName,
      farmerId: job.farmerId,
      farmerName: job.farmerName,
      workerId: workerUser.id,
      workerName: workerUser.fullName,
      workerSkills: workerProfile?.skills.join(', ') || 'Agricultural Worker',
      proposedWageNaira: Number(proposedWageNaira) || job.paymentAmountNaira,
      message: (message || 'Available and ready to work according to the listed schedule.').trim(),
      status: 'Applied',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    platformState.workerApplications.unshift(appRecord);
    pushNotification({
      userId: job.hirerId,
      title: `New Job Application from ${workerUser.fullName}`,
      body: `Applied to "${job.jobTitle}" (${job.location}).`,
      category: 'Job Application',
      relatedId: appRecord.id,
    });
    savePlatformState();
    res.status(201).json({
      application: appRecord,
      snapshot: buildRoleScopedSnapshot(workerUser.id, workerUser.role),
    });
  });

  // Job Owner Accepts/Declines Application OR Worker Withdraws Application
  app.post('/api/worker-applications/:applicationId/respond', (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const { actorId, decision, supervisionRequired } = req.body as {
      actorId: string;
      decision: 'HIRE' | 'DECLINE' | 'WITHDRAW';
      supervisionRequired?: boolean;
    };

    const actor = platformState.users[actorId];
    const targetApp = platformState.workerApplications.find((a) => a.id === applicationId);
    if (!actor || !targetApp) {
      res.status(404).json({ error: 'Worker application or user not found.' });
      return;
    }

    const nowIso = new Date().toISOString();

    if (decision === 'WITHDRAW') {
      if (actor.id !== targetApp.workerId || targetApp.status !== 'Applied') {
        res.status(403).json({ error: 'Only the applicant worker can withdraw an active pending application.' });
        return;
      }
      targetApp.status = 'Withdrawn';
      targetApp.updatedAt = nowIso;
      savePlatformState();
      res.json({ application: targetApp, snapshot: buildRoleScopedSnapshot(actor.id, actor.role) });
      return;
    }

    // Only job owner (Farmer or Sponsor) may HIRE or DECLINE — Workers cannot self-accept
    if (actor.id !== targetApp.hirerId && actor.id !== targetApp.farmerId) {
      res.status(403).json({
        error: 'Workers cannot accept themselves into jobs. Only the Farmer or Sponsor who published the job can hire.',
      });
      return;
    }

    if (decision === 'DECLINE') {
      targetApp.status = 'Declined';
      targetApp.updatedAt = nowIso;
      pushNotification({
        userId: targetApp.workerId,
        title: `Application Update: ${targetApp.jobTitle}`,
        body: `${actor.fullName} did not select your application for this slot.`,
        category: 'Job Application',
        relatedId: targetApp.id,
      });
      savePlatformState();
      res.json({ application: targetApp, snapshot: buildRoleScopedSnapshot(actor.id, actor.role) });
      return;
    }

    const job = platformState.workerRequests.find((r) => r.id === targetApp.workerRequestId);
    targetApp.status = 'Accepted';
    targetApp.updatedAt = nowIso;

    const agrId = `wagr_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const agreement: WorkerAgreement = {
      id: agrId,
      ownerId: actor.id,
      workerRequestId: targetApp.workerRequestId,
      applicationId: targetApp.id,
      jobTitle: targetApp.jobTitle,
      hirerId: targetApp.hirerId,
      hirerRole: targetApp.hirerRole,
      hirerName: targetApp.hirerName,
      farmerId: targetApp.farmerId,
      farmerName: targetApp.farmerName,
      workerId: targetApp.workerId,
      workerName: targetApp.workerName,
      location: targetApp.location,
      agreedWageNaira: targetApp.proposedWageNaira,
      paymentBasis: job?.paymentBasis || 'Per Worker (Total Task)',
      paymentMethod: job?.paymentMethod || 'Embedded Stellar USDC Wallet',
      startDate: job?.startDate || nowIso.slice(0, 10),
      expectedDuration: job?.expectedDuration || 'Agreed schedule',
      supervisionRequired: Boolean(supervisionRequired ?? job?.supervisionRequired),
      workCompletedConfirmed: false,
      status: 'Active Work',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const payment: WorkerPayment = {
      id: `wpay_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      workerAgreementId: agrId,
      workerRequestId: targetApp.workerRequestId,
      jobTitle: targetApp.jobTitle,
      farmerId: targetApp.farmerId,
      farmerName: targetApp.farmerName,
      hirerId: targetApp.hirerId,
      hirerName: targetApp.hirerName,
      workerId: targetApp.workerId,
      workerName: targetApp.workerName,
      amountNaira: targetApp.proposedWageNaira,
      sponsorShareDeducted: 0,
      paymentMethod: agreement.paymentMethod,
      workConfirmedByFarmer: false,
      paymentConfirmedByWorker: false,
      status: 'Pending Work Completion',
      paidAt: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    platformState.workerAgreements.unshift(agreement);
    platformState.workerPayments.unshift(payment);

    const workerAcceptanceFee = createAcceptanceFeeRecordIfMissing({
      obligorId: targetApp.workerId,
      obligorName: targetApp.workerName,
      obligorRole: 'Worker',
      beneficiaryId: targetApp.hirerId,
      beneficiaryName: targetApp.hirerName,
      agreementType: 'WorkerHiring',
      agreementId: agrId,
      agreementTitle: targetApp.jobTitle,
      agreedPrincipalNaira: targetApp.proposedWageNaira,
    });

    if (job) {
      job.workersHired = Math.min(job.workersNeeded, job.workersHired + 1);
      job.status = job.workersHired >= job.workersNeeded ? 'In Progress' : 'Hiring in Progress';
      job.updatedAt = nowIso;
    }

    pushNotification({
      userId: targetApp.workerId,
      title: `Hired for "${targetApp.jobTitle}"`,
      body: `${actor.fullName} selected you for ₦${targetApp.proposedWageNaira.toLocaleString('en-NG')} (0% sponsor deduction). Lock your ${workerAcceptanceFee.feeAmountUsdc.toFixed(2)} USDC refundable Acceptance Fee to confirm attendance.`,
      category: 'Job Application',
      relatedId: agreement.id,
    });

    savePlatformState();
    res.json({
      application: targetApp,
      agreement,
      payment,
      acceptanceFee: workerAcceptanceFee,
      snapshot: buildRoleScopedSnapshot(actor.id, actor.role),
    });
  });

  // Worker Payment Settlement (Hirer confirms work completion + pays, Worker confirms receipt; 0% sponsor deduction)
  app.post('/api/worker-payments/:paymentId/transition', async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const { actorId, action } = req.body as {
      actorId: string;
      action: 'FARMER_CONFIRM_WORK_AND_INITIATE' | 'WORKER_CONFIRM_RECEIPT';
    };

    const actor = platformState.users[actorId];
    const paymentIdx = platformState.workerPayments.findIndex((p) => p.id === paymentId);
    if (!actor || paymentIdx === -1) {
      res.status(404).json({ error: 'Worker payment record not found.' });
      return;
    }

    const payment = platformState.workerPayments[paymentIdx];
    if (
      action === 'FARMER_CONFIRM_WORK_AND_INITIATE' &&
      actor.id !== payment.farmerId &&
      actor.id !== payment.hirerId
    ) {
      res.status(403).json({ error: 'Only the hiring party may confirm work completion and initiate wage payment.' });
      return;
    }
    if (action === 'WORKER_CONFIRM_RECEIPT' && actor.id !== payment.workerId) {
      res.status(403).json({ error: 'Only the hired worker may confirm receipt of wage payment.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const updated = evaluateWorkerPaymentTransition(payment, action, nowIso);
    platformState.workerPayments[paymentIdx] = updated;

    if (updated.status === 'Confirmed Paid') {
      const agr = platformState.workerAgreements.find((a) => a.id === updated.workerAgreementId);
      if (agr) {
        agr.workCompletedConfirmed = true;
        agr.status = 'Work Completed';
        agr.updatedAt = nowIso;
      }
      const workerProf = platformState.workerProfiles[updated.workerId];
      if (workerProf) {
        workerProf.completedJobsCount += 1;
        workerProf.updatedAt = nowIso;
      }

      const feeIdx = platformState.acceptanceFees.findIndex(
        (f) => f.agreementId === updated.workerAgreementId && f.status === 'Locked in Escrow'
      );
      if (feeIdx !== -1) {
        let settlementHash = 'AUTO_REFUND_ON_WORK_CONFIRMED';
        if (hooks?.onExecuteAcceptanceFeeSettlement) {
          const resSettle = await hooks.onExecuteAcceptanceFeeSettlement({
            action: 'REFUND',
            fee: platformState.acceptanceFees[feeIdx],
          });
          settlementHash = resSettle.transactionHash;
        }
        const evalRefund = evaluateAcceptanceFeeTransition({
          record: platformState.acceptanceFees[feeIdx],
          action: 'REFUND_ON_COMPLETION',
          actorId: updated.hirerId || updated.farmerId,
          actorRole: 'Sponsor',
          timestampIso: nowIso,
          settlementHash,
        });
        if (evalRefund.allowed) {
          platformState.acceptanceFees[feeIdx] = evalRefund.nextRecord;
          pushNotification({
            userId: evalRefund.nextRecord.obligorId,
            title: `Acceptance Fee Refunded (${evalRefund.nextRecord.feeAmountUsdc.toFixed(2)} USDC)`,
            body: `Work "${updated.jobTitle}" confirmed complete & paid. Your acceptance fee is 100% refunded.`,
            category: 'Acceptance Fee',
            relatedId: evalRefund.nextRecord.id,
          });
        }
      }
    }

    savePlatformState();
    res.json({
      payment: updated,
      snapshot: buildRoleScopedSnapshot(actor.id, actor.role),
    });
  });

  // 8. Supervision Workflow (Controlled Requests, Invitations, Accept/Decline & Reports)
  app.post('/api/supervision/requests', (req: Request, res: Response) => {
    const {
      actorId,
      agreementId,
      agreementCategory,
      invitedSupervisorId,
      supervisionInstructions,
    } = req.body as {
      actorId: string;
      agreementId: string;
      agreementCategory: SupervisionRequest['agreementCategory'];
      invitedSupervisorId: string;
      supervisionInstructions?: string;
    };

    const actor = platformState.users[actorId];
    const supervisor = platformState.users[invitedSupervisorId];
    if (!actor || (actor.role !== 'Farmer' && actor.role !== 'Sponsor')) {
      res.status(403).json({ error: 'Only an authorised Farmer or Sponsor on an accepted agreement may request supervision.' });
      return;
    }
    if (!supervisor || supervisor.role !== 'Supervisor') {
      res.status(400).json({ error: 'Selected user is not a registered Supervisor.' });
      return;
    }

    const nowIso = new Date().toISOString();
    let projectTitle = '';
    let location = '';
    let farmerId: string | undefined;
    let farmerName: string | undefined;
    let sponsorId: string | undefined;
    let sponsorName: string | undefined;
    let workerId: string | undefined;
    let workerName: string | undefined;
    let agreedWorkSummary = '';
    let expectedStartDate = nowIso.slice(0, 10);
    let expectedCompletionDate = '';

    if (agreementCategory === 'Sponsor & Farmer Support Agreement') {
      const agr = platformState.supportAgreements.find((a) => a.id === agreementId);
      if (!agr || agr.status !== 'Active Agreement') {
        res.status(400).json({ error: 'Support agreement must be accepted and active before requesting supervision.' });
        return;
      }
      if (actor.id !== agr.farmerId && actor.id !== agr.sponsorId) {
        res.status(403).json({ error: 'You are not a party to this agreement.' });
        return;
      }
      agr.supervisionRequired = true;
      agr.updatedAt = nowIso;
      projectTitle = agr.requestTitle;
      location = agr.location || 'Registered Farm Site';
      farmerId = agr.farmerId;
      farmerName = agr.farmerName;
      sponsorId = agr.sponsorId;
      sponsorName = agr.sponsorName;
      agreedWorkSummary = `${agr.sponsorContribution} · ${agr.shareType}`;
      expectedStartDate = agr.expectedStartDate || nowIso.slice(0, 10);
      expectedCompletionDate = agr.expectedCompletionDate || 'Seasonal Completion';
    } else {
      const agr = platformState.workerAgreements.find((a) => a.id === agreementId);
      if (!agr || agr.status !== 'Active Work') {
        res.status(400).json({ error: 'Worker hiring agreement must be active before requesting supervision.' });
        return;
      }
      if (actor.id !== agr.hirerId && actor.id !== agr.farmerId) {
        res.status(403).json({ error: 'You are not the hiring party on this agreement.' });
        return;
      }
      agr.supervisionRequired = true;
      agr.updatedAt = nowIso;
      projectTitle = agr.jobTitle;
      location = agr.location || 'Farm Work Location';
      farmerId = agr.hirerRole === 'Farmer' ? agr.hirerId : undefined;
      farmerName = agr.hirerRole === 'Farmer' ? agr.hirerName : undefined;
      sponsorId = agr.hirerRole === 'Sponsor' ? agr.hirerId : undefined;
      sponsorName = agr.hirerRole === 'Sponsor' ? agr.hirerName : undefined;
      workerId = agr.workerId;
      workerName = agr.workerName;
      agreedWorkSummary = `Agreed labour assignment: ${agr.jobTitle} (₦${agr.agreedWageNaira.toLocaleString('en-NG')})`;
      expectedStartDate = agr.startDate;
      expectedCompletionDate = agr.expectedDuration;
    }

    const supReq: SupervisionRequest = {
      id: `svrq_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ownerId: actor.id,
      requestedById: actor.id,
      requestedByName: actor.fullName,
      requestedByRole: actor.role,
      agreementId,
      agreementCategory,
      projectTitle,
      location,
      farmerId,
      farmerName,
      sponsorId,
      sponsorName,
      workerId,
      workerName,
      agreedWorkSummary,
      expectedStartDate,
      expectedCompletionDate,
      supervisionInstructions: (
        supervisionInstructions ||
        'Monitor work milestones, verify site execution with photos, and submit neutral inspection reports.'
      ).trim(),
      invitedSupervisorId: supervisor.id,
      invitedSupervisorName: supervisor.fullName,
      status: 'Invited',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    platformState.supervisionRequests.unshift(supReq);
    pushNotification({
      userId: supervisor.id,
      title: `Supervision Invitation: ${projectTitle}`,
      body: `${actor.fullName} invited you to supervise an accepted agreement (${location}).`,
      category: 'Supervision',
      relatedId: supReq.id,
    });
    savePlatformState();
    res.status(201).json({
      supervisionRequest: supReq,
      snapshot: buildRoleScopedSnapshot(actor.id, actor.role),
    });
  });

  // Invited Supervisor Accepts or Declines Supervision Invitation
  app.post('/api/supervision/requests/:requestId/respond', (req: Request, res: Response) => {
    const { requestId } = req.params;
    const { supervisorId, decision, note } = req.body as {
      supervisorId: string;
      decision: 'ACCEPT' | 'DECLINE';
      note?: string;
    };

    const supervisor = platformState.users[supervisorId];
    const supReq = platformState.supervisionRequests.find((r) => r.id === requestId);
    if (!supervisor || supervisor.role !== 'Supervisor' || !supReq || supReq.invitedSupervisorId !== supervisorId) {
      res.status(403).json({ error: 'Only the invited Supervisor may respond to this supervision invitation.' });
      return;
    }

    const nowIso = new Date().toISOString();
    supReq.updatedAt = nowIso;
    if (note) supReq.responseNote = note.trim();

    if (decision === 'DECLINE') {
      supReq.status = 'Declined';
      pushNotification({
        userId: supReq.requestedById,
        title: `Supervision Declined: ${supReq.projectTitle}`,
        body: `${supervisor.fullName} declined the supervision invitation.`,
        category: 'Supervision',
        relatedId: supReq.id,
      });
      savePlatformState();
      res.json({
        supervisionRequest: supReq,
        snapshot: buildRoleScopedSnapshot(supervisorId, 'Supervisor'),
      });
      return;
    }

    supReq.status = 'Accepted';
    const assignment: SupervisionAssignment = {
      id: `svas_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ownerId: supReq.requestedById,
      supervisionRequestId: supReq.id,
      agreementId: supReq.agreementId,
      agreementCategory: supReq.agreementCategory,
      projectTitle: supReq.projectTitle,
      location: supReq.location,
      supervisorId: supervisor.id,
      supervisorName: supervisor.fullName,
      farmerId: supReq.farmerId,
      farmerName: supReq.farmerName,
      sponsorId: supReq.sponsorId,
      sponsorName: supReq.sponsorName,
      workerId: supReq.workerId,
      workerName: supReq.workerName,
      agreedWorkSummary: supReq.agreedWorkSummary,
      expectedStartDate: supReq.expectedStartDate,
      expectedCompletionDate: supReq.expectedCompletionDate,
      supervisionRequirements: supReq.supervisionInstructions,
      status: 'Active Supervision',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    platformState.supervisionAssignments.unshift(assignment);

    const supAgr = platformState.supportAgreements.find((a) => a.id === supReq.agreementId);
    if (supAgr) {
      supAgr.assignedSupervisorId = supervisor.id;
      supAgr.assignedSupervisorName = supervisor.fullName;
      supAgr.updatedAt = nowIso;
    }
    const wrkAgr = platformState.workerAgreements.find((a) => a.id === supReq.agreementId);
    if (wrkAgr) {
      wrkAgr.assignedSupervisorId = supervisor.id;
      wrkAgr.assignedSupervisorName = supervisor.fullName;
      wrkAgr.updatedAt = nowIso;
    }

    pushNotification({
      userId: supReq.requestedById,
      title: `Supervisor Assigned: ${supervisor.fullName}`,
      body: `Accepted supervision for "${supReq.projectTitle}".`,
      category: 'Supervision',
      relatedId: assignment.id,
    });
    savePlatformState();
    res.json({
      supervisionRequest: supReq,
      assignment,
      snapshot: buildRoleScopedSnapshot(supervisorId, 'Supervisor'),
    });
  });

  // Assigned Supervisor submits inspection/progress/misuse/completion report (never alters financial terms or releases escrow)
  app.post('/api/supervision/reports', (req: Request, res: Response) => {
    const {
      supervisorId,
      assignmentId,
      reportType,
      summary,
      observations,
      recommendCompletion,
      evidenceUrls,
    } = req.body as {
      supervisorId: string;
      assignmentId: string;
      reportType: SupervisionReport['reportType'];
      summary: string;
      observations: string;
      recommendCompletion?: boolean;
      evidenceUrls?: string[];
    };

    const supervisor = platformState.users[supervisorId];
    const assignment = platformState.supervisionAssignments.find((a) => a.id === assignmentId);
    if (!supervisor || supervisor.role !== 'Supervisor' || !assignment) {
      res.status(404).json({ error: 'Supervision assignment or supervisor not found.' });
      return;
    }

    if (
      !canSupervisorAccessProject({
        supervisorId,
        assignment,
        agreementAccepted: true,
        supervisionRequired: true,
      })
    ) {
      res.status(403).json({
        error: 'Access denied: Only the assigned supervisor for this accepted agreement may submit inspection reports.',
      });
      return;
    }

    if (!summary?.trim() || !observations?.trim()) {
      res.status(400).json({ error: 'Report summary and observations are required.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const report: SupervisionReport = {
      id: `svrp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ownerId: supervisorId,
      assignmentId,
      agreementId: assignment.agreementId,
      supervisorId,
      supervisorName: supervisor.fullName,
      reportType: reportType || 'Progress Inspection',
      summary: summary.trim(),
      observations: observations.trim(),
      recommendCompletion: Boolean(recommendCompletion),
      evidenceUrls: evidenceUrls || [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    platformState.supervisionReports.unshift(report);

    if (recommendCompletion) {
      assignment.status = 'Completion Recommended';
      assignment.completionRecommendedAt = nowIso;
      assignment.updatedAt = nowIso;
    }

    // Notify involved project parties ONLY (evidence note — does NOT trigger payment automatically)
    for (const partyId of [assignment.farmerId, assignment.sponsorId, assignment.workerId]) {
      if (partyId) {
        pushNotification({
          userId: partyId,
          title: `Supervisor Report: ${assignment.projectTitle}`,
          body: `${supervisor.fullName} submitted "${report.reportType}": ${report.summary}`,
          category: 'Supervision',
          relatedId: report.id,
        });
      }
    }

    savePlatformState();
    res.status(201).json({
      report,
      assignment,
      snapshot: buildRoleScopedSnapshot(supervisorId, 'Supervisor'),
    });
  });

  // 9. Messaging & Notifications (Authorised Participants Only)
  app.post('/api/messages', (req: Request, res: Response) => {
    const {
      senderId,
      recipientId,
      contextType,
      contextTitle,
      body,
      attachments,
      replyToId,
      replyToPreview,
    } = req.body as {
      senderId: string;
      recipientId: string;
      contextType?: Conversation['contextType'];
      contextTitle?: string;
      body: string;
      attachments?: string[];
      replyToId?: string;
      replyToPreview?: string;
    };

    const sender = platformState.users[senderId];
    const recipient = platformState.users[recipientId];
    if (!sender || !recipient || !body?.trim()) {
      res.status(400).json({ error: 'Valid sender, recipient, and non-empty message body are required.' });
      return;
    }

    if (senderId === recipientId) {
      res.status(400).json({ error: 'Cannot send a message to yourself.' });
      return;
    }

    // Check conversation authorization for Supervisors (only assigned/invited project participants)
    if (sender.role === 'Supervisor') {
      const allowedParties = new Set<string>();
      for (const a of platformState.supervisionAssignments) {
        if (a.supervisorId === sender.id) {
          if (a.farmerId) allowedParties.add(a.farmerId);
          if (a.sponsorId) allowedParties.add(a.sponsorId);
          if (a.workerId) allowedParties.add(a.workerId);
        }
      }
      for (const r of platformState.supervisionRequests) {
        if (r.invitedSupervisorId === sender.id) {
          allowedParties.add(r.requestedById);
          if (r.farmerId) allowedParties.add(r.farmerId);
          if (r.sponsorId) allowedParties.add(r.sponsorId);
          if (r.workerId) allowedParties.add(r.workerId);
        }
      }
      if (!allowedParties.has(recipient.id) && recipient.role !== 'Admin') {
        res.status(403).json({
          error: 'Supervisors may only message participants on projects they are invited or assigned to supervise.',
        });
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const pairKey = [sender.id, recipient.id].sort().join('__');
    let convo = platformState.conversations.find((c) => c.id === `conv_${pairKey}`);
    if (!convo) {
      convo = {
        id: `conv_${pairKey}`,
        participantIds: [sender.id, recipient.id],
        participantNames: {
          [sender.id]: sender.fullName,
          [recipient.id]: recipient.fullName,
        },
        participantRoles: {
          [sender.id]: sender.role,
          [recipient.id]: recipient.role,
        },
        contextType: contextType || 'General',
        contextTitle: contextTitle || `${sender.fullName} & ${recipient.fullName}`,
        lastMessagePreview: body.trim().slice(0, 80),
        lastMessageAt: nowIso,
        unreadByUser: {
          [sender.id]: 0,
          [recipient.id]: 1,
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      platformState.conversations.unshift(convo);
    } else {
      convo.lastMessagePreview = body.trim().slice(0, 80);
      convo.lastMessageAt = nowIso;
      convo.unreadByUser[recipient.id] = (convo.unreadByUser[recipient.id] || 0) + 1;
      convo.updatedAt = nowIso;
    }

    const msg: DirectMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      conversationId: convo.id,
      senderId: sender.id,
      senderName: sender.fullName,
      senderRole: sender.role,
      recipientId: recipient.id,
      recipientName: recipient.fullName,
      contextTitle: contextTitle || convo.contextTitle,
      body: body.trim(),
      attachments: attachments || [],
      readBy: [sender.id],
      replyToId,
      replyToPreview,
      createdAt: nowIso,
    };

    platformState.messages.unshift(msg);
    pushNotification({
      userId: recipient.id,
      title: `New Message from ${sender.fullName} (${sender.role})`,
      body: body.trim().slice(0, 90),
      category: 'Message',
      relatedId: convo.id,
    });
    savePlatformState();
    res.status(201).json({
      message: msg,
      conversation: convo,
      snapshot: buildRoleScopedSnapshot(sender.id, sender.role),
    });
  });

  app.post('/api/messages/mark-read', (req: Request, res: Response) => {
    const { userId, conversationId } = req.body as { userId: string; conversationId?: string };
    const user = platformState.users[userId];
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (conversationId) {
      const convo = platformState.conversations.find((c) => c.id === conversationId);
      if (convo) {
        convo.unreadByUser[userId] = 0;
      }
      for (const m of platformState.messages) {
        if (m.conversationId === conversationId && m.recipientId === userId) {
          m.readBy = Array.from(new Set([...(m.readBy || []), userId]));
        }
      }
    }
    for (const n of platformState.notifications) {
      if (n.userId === userId) {
        n.read = true;
      }
    }
    savePlatformState();
    res.json({ snapshot: buildRoleScopedSnapshot(userId, user.role) });
  });

  // 10. Restricted Admin Verification & Oversight Controls
  app.post('/api/admin/verification', (req: Request, res: Response) => {
    const { adminId, targetUserId, status, reviewerNotes } = req.body as {
      adminId: string;
      targetUserId: string;
      status: ProfileVerificationStatus;
      reviewerNotes?: string;
    };

    const adminUser = platformState.users[adminId];
    const targetUser = platformState.users[targetUserId];
    if (!adminUser || adminUser.role !== 'Admin') {
      res.status(403).json({
        error: 'Access denied: Only authorised Administrators can approve or update account verification status.',
      });
      return;
    }
    if (!targetUser) {
      res.status(404).json({ error: 'Target user not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    targetUser.verificationStatus = status;
    targetUser.verificationNotes = reviewerNotes?.trim();
    targetUser.updatedAt = nowIso;

    if (platformState.workerProfiles[targetUserId]) {
      platformState.workerProfiles[targetUserId].verificationStatus = status;
      platformState.workerProfiles[targetUserId].updatedAt = nowIso;
    }
    if (platformState.farmerProfiles[targetUserId]) {
      platformState.farmerProfiles[targetUserId].verificationStatus = status;
      platformState.farmerProfiles[targetUserId].updatedAt = nowIso;
    }
    if (platformState.supervisorProfiles[targetUserId]) {
      platformState.supervisorProfiles[targetUserId].verificationStatus = status;
      platformState.supervisorProfiles[targetUserId].updatedAt = nowIso;
    }
    if (platformState.sponsorProfiles[targetUserId]) {
      platformState.sponsorProfiles[targetUserId].verificationStatus = status;
      platformState.sponsorProfiles[targetUserId].updatedAt = nowIso;
    }
    if (platformState.organisations[targetUserId]) {
      platformState.organisations[targetUserId].verificationStatus = status;
      platformState.organisations[targetUserId].updatedAt = nowIso;
    }

    for (const appRecord of platformState.verificationApplications) {
      if (appRecord.userId === targetUserId) {
        appRecord.status = status;
        appRecord.reviewerId = adminUser.id;
        appRecord.reviewerName = adminUser.fullName;
        appRecord.reviewerNotes = reviewerNotes?.trim();
        appRecord.reviewedAt = nowIso;
        appRecord.updatedAt = nowIso;
      }
    }

    pushNotification({
      userId: targetUserId,
      title: `Verification Status Updated: ${status}`,
      body:
        reviewerNotes?.trim() ||
        `Your ${targetUser.role} account verification status is now ${status}.`,
      category: 'Verification',
      relatedId: targetUserId,
    });

    pushAdminAudit({
      actorId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: 'Admin',
      action: `VERIFICATION_${status.toUpperCase().replace(/\s+/g, '_')}`,
      targetCollection: 'verificationApplications',
      targetId: targetUserId,
      summary: `${adminUser.fullName} set ${targetUser.fullName} (${targetUser.role}) verification status to ${status}.`,
    });

    savePlatformState();
    res.json({
      user: targetUser,
      snapshot: buildRoleScopedSnapshot(adminUser.id, 'Admin'),
    });
  });

  app.post('/api/admin/disputes/:disputeId/resolve', (req: Request, res: Response) => {
    const { disputeId } = req.params;
    const { adminId, resolutionNotes } = req.body as {
      adminId: string;
      resolutionNotes: string;
    };
    const adminUser = platformState.users[adminId];
    if (!adminUser || adminUser.role !== 'Admin') {
      res.status(403).json({ error: 'Only authorised Administrators can resolve disputes.' });
      return;
    }
    const dispute = platformState.disputes.find((d) => d.id === disputeId);
    if (!dispute) {
      res.status(404).json({ error: 'Dispute record not found.' });
      return;
    }
    dispute.status = 'Resolved';
    dispute.resolutionNotes = (resolutionNotes || '').trim();
    dispute.updatedAt = new Date().toISOString();
    pushAdminAudit({
      actorId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: 'Admin',
      action: 'DISPUTE_RESOLVED',
      targetCollection: 'disputes',
      targetId: disputeId,
      summary: `Dispute "${dispute.title}" marked Resolved.`,
    });
    savePlatformState();
    res.json({ dispute, snapshot: buildRoleScopedSnapshot(adminUser.id, 'Admin') });
  });

  // ============================================================================
  // 11. ACCEPTANCE FEE ESCROW (ANTI-ABSCONDING BOND FOR WORKERS & FARMERS)
  // ============================================================================
  app.post('/api/acceptance-fees/:feeId/lock', async (req: Request, res: Response) => {
    const { feeId } = req.params;
    const { actorId } = req.body as { actorId: string };
    const actor = platformState.users[actorId];
    const idx = platformState.acceptanceFees.findIndex((f) => f.id === feeId);
    if (!actor || idx === -1) {
      res.status(404).json({ error: 'Acceptance fee record or user not found.' });
      return;
    }

    const record = platformState.acceptanceFees[idx];
    let txHash = 'COMMITMENT_ESCROW_LOCKED';
    if (hooks?.onExecuteAcceptanceFeeSettlement) {
      const settled = await hooks.onExecuteAcceptanceFeeSettlement({
        action: 'LOCK',
        fee: record,
      });
      txHash = settled.transactionHash;
    }

    const nowIso = new Date().toISOString();
    const transition = evaluateAcceptanceFeeTransition({
      record,
      action: 'LOCK_FEE',
      actorId: actor.id,
      actorRole: actor.role,
      timestampIso: nowIso,
      settlementHash: txHash,
    });

    if (!transition.allowed) {
      res.status(403).json({ error: transition.error });
      return;
    }

    platformState.acceptanceFees[idx] = transition.nextRecord;
    pushNotification({
      userId: record.beneficiaryId,
      title: `Acceptance Fee Locked by ${record.obligorName}`,
      body: `${record.obligorName} (${record.obligorRole}) locked ${record.feeAmountUsdc.toFixed(2)} USDC commitment bond for "${record.agreementTitle}".`,
      category: 'Acceptance Fee',
      relatedId: record.id,
    });
    savePlatformState();
    res.json({
      acceptanceFee: transition.nextRecord,
      snapshot: buildRoleScopedSnapshot(actor.id, actor.role),
    });
  });

  app.post('/api/acceptance-fees/:feeId/resolve', async (req: Request, res: Response) => {
    const { feeId } = req.params;
    const { actorId, action, reason } = req.body as {
      actorId: string;
      action: 'REFUND_ON_COMPLETION' | 'FORFEIT_ABSCONDED' | 'DISPUTE';
      reason?: string;
    };

    const actor = platformState.users[actorId];
    const idx = platformState.acceptanceFees.findIndex((f) => f.id === feeId);
    if (!actor || idx === -1) {
      res.status(404).json({ error: 'Acceptance fee record or user not found.' });
      return;
    }

    const record = platformState.acceptanceFees[idx];
    const evalAction =
      action === 'FORFEIT_ABSCONDED'
        ? 'REPORT_ABSCONDED_AND_FORFEIT'
        : action === 'DISPUTE'
          ? 'DISPUTE'
          : 'REFUND_ON_COMPLETION';

    const nowIso = new Date().toISOString();
    const preCheck = evaluateAcceptanceFeeTransition({
      record,
      action: evalAction,
      actorId: actor.id,
      actorRole: actor.role,
      timestampIso: nowIso,
      reason,
    });

    if (!preCheck.allowed) {
      res.status(400).json({ error: preCheck.error });
      return;
    }

    let settlementHash = preCheck.nextRecord.settlementHash || 'SETTLED';
    if (hooks?.onExecuteAcceptanceFeeSettlement && action !== 'DISPUTE') {
      const settled = await hooks.onExecuteAcceptanceFeeSettlement({
        action: action === 'FORFEIT_ABSCONDED' ? 'FORFEIT' : 'REFUND',
        fee: record,
      });
      settlementHash = settled.transactionHash;
    }

    const finalTransition = evaluateAcceptanceFeeTransition({
      record,
      action: evalAction,
      actorId: actor.id,
      actorRole: actor.role,
      timestampIso: nowIso,
      reason,
      settlementHash,
    });
    platformState.acceptanceFees[idx] = finalTransition.nextRecord;

    if (action === 'FORFEIT_ABSCONDED') {
      const dispute: DisputeRecord = {
        id: `disp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        category: 'Acceptance Fee / Absconding',
        referenceId: record.id,
        title: `Absconding Claim & Acceptance Fee Forfeiture: ${record.obligorName}`,
        raisedById: actor.id,
        raisedByName: actor.fullName,
        summary: `${record.obligorName} (${record.obligorRole}) reported absconded / gone into hiding on "${record.agreementTitle}". Acceptance fee (${record.feeAmountUsdc.toFixed(2)} USDC) forfeited to ${record.beneficiaryName}. Reason: ${reason?.trim()}`,
        status: 'Under Mediation',
        resolutionNotes: 'Acceptance fee forfeited to aggrieved sponsor/hirer; available for Admin review if appealed.',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      platformState.disputes.unshift(dispute);

      pushNotification({
        userId: record.obligorId,
        title: `Acceptance Fee Forfeited (${record.feeAmountUsdc.toFixed(2)} USDC)`,
        body: `${actor.fullName} reported no-show/absconding on "${record.agreementTitle}". Reason: ${reason?.trim()}`,
        category: 'Acceptance Fee',
        relatedId: record.id,
      });
      pushAdminAudit({
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        action: 'ACCEPTANCE_FEE_FORFEITED_ABSCONDED',
        targetCollection: 'acceptanceFees',
        targetId: record.id,
        summary: `Forfeited ${record.feeAmountUsdc.toFixed(2)} USDC from ${record.obligorName} (${record.obligorRole}) to ${record.beneficiaryName}.`,
      });
    } else if (action === 'REFUND_ON_COMPLETION') {
      pushNotification({
        userId: record.obligorId,
        title: `Acceptance Fee Refunded (${record.feeAmountUsdc.toFixed(2)} USDC)`,
        body: `${actor.fullName} verified completion of "${record.agreementTitle}" and released your 100% refundable acceptance fee.`,
        category: 'Acceptance Fee',
        relatedId: record.id,
      });
    }

    savePlatformState();
    res.json({
      acceptanceFee: finalTransition.nextRecord,
      snapshot: buildRoleScopedSnapshot(actor.id, actor.role),
    });
  });

  // ============================================================================
  // 12. SPONSOR USDC PAYMENT RECORDING (FARM SPONSORSHIP / POST-WORK SETTLEMENTS)
  // ============================================================================
  app.post('/api/sponsor-payments/record', (req: Request, res: Response) => {
    const {
      sponsorId,
      recipientId,
      purpose,
      amountUsdc,
      amountNaira,
      transactionHash,
      relatedAgreementId,
      relatedWorkerPaymentId,
      note,
    } = req.body as {
      sponsorId: string;
      recipientId: string;
      purpose:
        | 'FARM_SPONSORSHIP'
        | 'POST_WORK_FARMER_SETTLEMENT'
        | 'POST_WORK_WORKER_WAGE'
        | 'SUPERVISION_FEE';
      amountUsdc: number;
      amountNaira?: number;
      transactionHash?: string;
      relatedAgreementId?: string;
      relatedWorkerPaymentId?: string;
      note?: string;
    };

    const sponsor = platformState.users[sponsorId];
    const recipient = platformState.users[recipientId];
    if (!sponsor || (sponsor.role !== 'Sponsor' && sponsor.role !== 'Farmer')) {
      res.status(403).json({ error: 'Authorised Sponsor or Hirer account required.' });
      return;
    }
    if (!recipient) {
      res.status(404).json({ error: 'Recipient user not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const cleanUsdc = Number(amountUsdc) || 0;
    const cleanNaira = Number(amountNaira) || Math.round(cleanUsdc * 1600);

    if (purpose === 'POST_WORK_WORKER_WAGE' && relatedWorkerPaymentId) {
      const pIdx = platformState.workerPayments.findIndex((p) => p.id === relatedWorkerPaymentId);
      if (pIdx !== -1 && platformState.workerPayments[pIdx].status === 'Pending Work Completion') {
        platformState.workerPayments[pIdx] = evaluateWorkerPaymentTransition(
          platformState.workerPayments[pIdx],
          'FARMER_CONFIRM_WORK_AND_INITIATE',
          nowIso
        );
      }
    }

    if (
      (purpose === 'FARM_SPONSORSHIP' || purpose === 'POST_WORK_FARMER_SETTLEMENT') &&
      relatedAgreementId
    ) {
      const agr = platformState.supportAgreements.find((a) => a.id === relatedAgreementId);
      if (agr) {
        agr.historyLog.push(
          `${nowIso.slice(0, 10)}: ${sponsor.fullName} recorded ${purpose === 'FARM_SPONSORSHIP' ? 'Direct Farm Sponsorship Funds' : 'Post-Work Farmer Settlement'} of ${cleanUsdc.toFixed(2)} USDC (₦${cleanNaira.toLocaleString('en-NG')})${transactionHash ? ` [Stellar TX: ${transactionHash.slice(0, 12)}...]` : ''}.`
        );
        agr.updatedAt = nowIso;
      }
    }

    const titleMap: Record<typeof purpose, string> = {
      FARM_SPONSORSHIP: `Farm Sponsorship Funds Sent (${cleanUsdc.toFixed(2)} USDC)`,
      POST_WORK_FARMER_SETTLEMENT: `Post-Work Farmer Settlement (${cleanUsdc.toFixed(2)} USDC)`,
      POST_WORK_WORKER_WAGE: `Worker Wage USDC Payment Initiated (${cleanUsdc.toFixed(2)} USDC)`,
      SUPERVISION_FEE: `Supervision Fee Received (${cleanUsdc.toFixed(2)} USDC)`,
    };

    pushNotification({
      userId: recipient.id,
      title: titleMap[purpose],
      body: `${sponsor.fullName} initiated a ${cleanUsdc.toFixed(2)} USDC payment${note ? ` — ${note}` : ''}.`,
      category: 'Wallet',
      relatedId: relatedAgreementId || relatedWorkerPaymentId || transactionHash,
    });

    savePlatformState();
    res.json({
      recorded: true,
      snapshot: buildRoleScopedSnapshot(sponsor.id, sponsor.role),
    });
  });

  // Helper check exposed for tests / role boundary checks
  app.get('/api/platform/wallet-permission/:userId', (req: Request, res: Response) => {
    const u = platformState.users[req.params.userId];
    if (!u) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({
      role: u.role,
      canExecuteTransfers: canRoleExecuteWalletTransfer(u.role),
    });
  });
}

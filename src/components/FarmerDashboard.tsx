import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Handshake,
  MapPin,
  Search,
  Sprout,
  User,
} from 'lucide-react';
import {
  AssistanceType,
  Conversation,
  DirectMessage,
  FARM_WORK_CATEGORIES,
  FarmerProfile,
  OrganisationProfile,
  PlatformNotification,
  PlatformUser,
  ShareArrangementType,
  SponsorFundingAgreement,
  SponsorOffer,
  SponsorProfile,
  SupervisionAssignment,
  SupervisionReport,
  SupervisionRequest,
  SupervisorProfile,
  SUPPORT_CATEGORY_OPTIONS,
  SupportRequest,
  WorkerAgreement,
  WorkerApplication,
  WorkerPayment,
  WorkerPaymentBasis,
  WorkerRequest,
} from '../types/farmfund';
import {
  calculateSponsorThirtyPercentShare,
  validateSupportRequestDraft,
  validateWorkerRequestDraft,
} from '../utils/farmfundLogic';
import { PrimaryRoleTab, RoleDashboardShell } from './RoleDashboardShell';
import { VerificationBanner } from './VerificationBanner';
import { MessageRecipientOption, MessagingCenter } from './MessagingCenter';
import { StellarWalletDashboard } from './StellarWalletDashboard';

interface FarmerDashboardProps {
  user: PlatformUser;
  farmerProfile: FarmerProfile;
  sponsorProfiles: SponsorProfile[];
  organisations: OrganisationProfile[];
  supervisorProfiles: SupervisorProfile[];
  supportRequests: SupportRequest[];
  sponsorOffers: SponsorOffer[];
  sponsorAgreements: SponsorFundingAgreement[];
  workerRequests: WorkerRequest[];
  workerApplications: WorkerApplication[];
  workerAgreements: WorkerAgreement[];
  workerPayments: WorkerPayment[];
  supervisionRequests: SupervisionRequest[];
  supervisionAssignments: SupervisionAssignment[];
  supervisionReports: SupervisionReport[];
  conversations: Conversation[];
  messages: DirectMessage[];
  notifications: PlatformNotification[];
  unreadCount: number;
  onCreateSupportRequest: (draft: Partial<SupportRequest>) => Promise<void>;
  onRespondToSponsorOffer: (
    offerId: string,
    decision: 'ACCEPT' | 'DECLINE' | 'REQUEST_INFO'
  ) => Promise<void>;
  onOpenAgreementModal: (agreement: SponsorFundingAgreement) => void;
  onCreateWorkerJob: (draft: Partial<WorkerRequest>) => Promise<void>;
  onRespondToWorkerApp: (
    applicationId: string,
    decision: 'HIRE' | 'DECLINE'
  ) => Promise<void>;
  onInitiateWorkerWagePayment: (paymentId: string) => Promise<void>;
  onRequestSupervision: (params: {
    agreementId: string;
    agreementCategory: SupervisionRequest['agreementCategory'];
    invitedSupervisorId: string;
    supervisionInstructions: string;
  }) => Promise<void>;
  onUpdateProfile: (profilePatch: Record<string, unknown>) => Promise<{
    reverificationTriggered: boolean;
  }>;
  onSendMessage: (params: {
    recipientId: string;
    contextType: Conversation['contextType'];
    contextTitle: string;
    body: string;
    attachments?: string[];
    replyToId?: string;
    replyToPreview?: string;
  }) => Promise<void>;
  onMarkConversationRead: (conversationId?: string) => Promise<void>;
  onSignOut: () => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  user,
  farmerProfile,
  sponsorProfiles,
  organisations,
  supervisorProfiles,
  supportRequests,
  sponsorOffers,
  sponsorAgreements,
  workerRequests,
  workerApplications,
  workerAgreements,
  workerPayments,
  supervisionRequests,
  supervisionAssignments,
  supervisionReports,
  conversations,
  messages,
  notifications,
  unreadCount,
  onCreateSupportRequest,
  onRespondToSponsorOffer,
  onOpenAgreementModal,
  onCreateWorkerJob,
  onRespondToWorkerApp,
  onInitiateWorkerWagePayment,
  onRequestSupervision,
  onUpdateProfile,
  onSendMessage,
  onMarkConversationRead,
  onSignOut,
}) => {
  const [primaryTab, setPrimaryTab] = useState<PrimaryRoleTab>('Dashboard');
  const [subView, setSubView] = useState<
    | 'Discover Sponsors'
    | 'Request Support'
    | 'Hire Farm Workers'
    | 'Agreements & Supervision'
    | 'Wallet'
  >('Discover Sponsors');

  // Sponsor discovery search/filter
  const [sponsorSearch, setSponsorSearch] = useState('');
  const [sponsorCatFilter, setSponsorCatFilter] = useState('All');
  const [targetSponsorId, setTargetSponsorId] = useState('');
  const [targetSponsorName, setTargetSponsorName] = useState('');

  // Support Request Form State
  const [supTitle, setSupTitle] = useState('');
  const [supAssistanceType, setSupAssistanceType] =
    useState<AssistanceType>('Financial Support');
  const [supFundingAmount, setSupFundingAmount] = useState('500000');
  const [supMaterials, setSupMaterials] = useState('');
  const [supFarmingPeriod, setSupFarmingPeriod] = useState('4 Months');
  const [supHarvestDate, setSupHarvestDate] = useState('2027-04-15');
  const [supEstimatedOutput, setSupEstimatedOutput] = useState('');
  const [supDescription, setSupDescription] = useState('');
  const [supShareModel, setSupShareModel] = useState<ShareArrangementType>(
    'None (Standard Support)'
  );
  const [supAckThirty, setSupAckThirty] = useState(false);
  const [supDocsText, setSupDocsText] = useState('');

  // Worker Job Publishing Form State (Strictly separated)
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategory, setJobCategory] = useState<string>(FARM_WORK_CATEGORIES[0]);
  const [jobCustomCat, setJobCustomCat] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobLocation, setJobLocation] = useState(farmerProfile.farmLocation || '');
  const [jobWorkersNeeded, setJobWorkersNeeded] = useState('3');
  const [jobSkills, setJobSkills] = useState('Prior farm labour experience');
  const [jobStartDate, setJobStartDate] = useState('2026-12-01');
  const [jobDuration, setJobDuration] = useState('4 Days');
  const [jobHours, setJobHours] = useState('7:00 AM - 3:00 PM');
  const [jobPayAmount, setJobPayAmount] = useState('10000');
  const [jobPayBasis, setJobPayBasis] = useState<WorkerPaymentBasis>('Per Worker (Total Task)');
  const [jobPayMethod, setJobPayMethod] = useState('Embedded Stellar USDC Wallet');
  const [jobAckWageRule, setJobAckWageRule] = useState(false);

  // Supervision Invitation Form State
  const [supAgrId, setSupAgrId] = useState('');
  const [supCategory, setSupCategory] = useState<SupervisionRequest['agreementCategory']>(
    'Sponsor & Farmer Support Agreement'
  );
  const [invitedSupervisorId, setInvitedSupervisorId] = useState('');
  const [supInstructions, setSupInstructions] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Editable Profile State
  const [fullName, setFullName] = useState(farmerProfile.fullName);
  const [phone, setPhone] = useState(farmerProfile.phone);
  const [country, setCountry] = useState(farmerProfile.country);
  const [stateName, setStateName] = useState(farmerProfile.state);
  const [lga, setLga] = useState(farmerProfile.lga);
  const [townOrFarmLocation, setTownOrFarmLocation] = useState(farmerProfile.townOrFarmLocation);
  const [farmName, setFarmName] = useState(farmerProfile.farmName);
  const [farmLocation, setFarmLocation] = useState(farmerProfile.farmLocation);
  const [farmingType, setFarmingType] = useState(farmerProfile.farmingType);
  const [cropsOrLivestock, setCropsOrLivestock] = useState(farmerProfile.cropsOrLivestock);
  const [farmSize, setFarmSize] = useState(farmerProfile.farmSize);
  const [yearsExp, setYearsExp] = useState(farmerProfile.yearsOfExperience);
  const [farmDescription, setFarmDescription] = useState(farmerProfile.farmDescription);
  const [govId, setGovId] = useState(farmerProfile.governmentIdDocument);
  const [profilePicture, setProfilePicture] = useState(farmerProfile.profilePicture);
  const [farmPhotos, setFarmPhotos] = useState((farmerProfile.farmPhotographs || []).join(', '));
  const [supportingDocs, setSupportingDocs] = useState(
    (farmerProfile.supportingDocuments || []).join(', ')
  );
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const filteredSponsors = useMemo(
    () =>
      sponsorProfiles.filter((sp) => {
        const q = sponsorSearch.trim().toLowerCase();
        const matchQ =
          !q ||
          sp.fullName.toLowerCase().includes(q) ||
          sp.location.toLowerCase().includes(q) ||
          sp.agriculturalInterests.join(' ').toLowerCase().includes(q);
        const matchCat =
          sponsorCatFilter === 'All' || sp.supportTypesProvided.includes(sponsorCatFilter);
        return matchQ && matchCat;
      }),
    [sponsorProfiles, sponsorSearch, sponsorCatFilter]
  );

  const sharePreview = calculateSponsorThirtyPercentShare({
    shareType: supShareModel,
    eligibleTotalAmount: Number(supFundingAmount) || 500000,
    unitLabel: supShareModel === '30% Farm Produce Share' ? 'units of harvest' : 'NGN',
  });

  const availableRecipients = useMemo<MessageRecipientOption[]>(() => {
    const map = new Map<string, MessageRecipientOption>();
    for (const sp of sponsorProfiles) {
      map.set(sp.userId, {
        id: sp.userId,
        name: sp.fullName,
        role: 'Sponsor',
        contextTitle: 'Farm Support Enquiry',
        contextType: 'Support',
      });
    }
    for (const app of workerApplications) {
      map.set(app.workerId, {
        id: app.workerId,
        name: app.workerName,
        role: 'Worker',
        contextTitle: app.jobTitle,
        contextType: 'Job',
      });
    }
    for (const asgn of supervisionAssignments) {
      map.set(asgn.supervisorId, {
        id: asgn.supervisorId,
        name: asgn.supervisorName,
        role: 'Supervisor',
        contextTitle: asgn.projectTitle,
        contextType: 'Supervision',
      });
    }
    return Array.from(map.values());
  }, [sponsorProfiles, workerApplications, supervisionAssignments]);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const draft: Partial<SupportRequest> = {
      farmerId: user.id,
      farmerName: user.fullName,
      targetSponsorId: targetSponsorId || undefined,
      targetSponsorName: targetSponsorName || undefined,
      title: supTitle.trim(),
      farmName: farmerProfile.farmName || farmName,
      farmingType: farmerProfile.farmingType || farmingType,
      cropOrProduceType: farmerProfile.cropsOrLivestock || cropsOrLivestock,
      location: farmerProfile.farmLocation || farmLocation,
      farmSize: farmerProfile.farmSize || farmSize,
      description: supDescription.trim(),
      assistanceType: supAssistanceType,
      fundingAmount: Number(supFundingAmount) || 0,
      materialsOrEquipment: supMaterials.trim(),
      farmingPeriod: supFarmingPeriod.trim(),
      expectedHarvestDate: supHarvestDate,
      estimatedOutput: supEstimatedOutput.trim(),
      preferredShareModel: supShareModel,
      acknowledgedThirtyPercentNotice: supAckThirty,
      supportingDocuments: supDocsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const err = validateSupportRequestDraft(draft);
    if (err) {
      setFeedback({ type: 'err', text: err });
      return;
    }
    setBusy(true);
    try {
      await onCreateSupportRequest(draft);
      setSupTitle('');
      setSupDescription('');
      setSupMaterials('');
      setSupEstimatedOutput('');
      setSupAckThirty(false);
      setTargetSponsorId('');
      setTargetSponsorName('');
      setFeedback({
        type: 'ok',
        text: 'Farm Support Request submitted. Track responses in Agreements & Supervision.',
      });
    } catch (e2: unknown) {
      setFeedback({
        type: 'err',
        text: e2 instanceof Error ? e2.message : 'Unable to submit request.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePublishJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const draft: Partial<WorkerRequest> = {
      jobTitle: jobTitle.trim(),
      workCategory: jobCategory,
      customWorkCategory: jobCustomCat.trim(),
      description: jobDesc.trim(),
      location: jobLocation.trim(),
      workersNeeded: Number(jobWorkersNeeded) || 1,
      requiredSkills: jobSkills.trim(),
      startDate: jobStartDate,
      expectedDuration: jobDuration.trim(),
      workingHours: jobHours.trim(),
      paymentAmountNaira: Number(jobPayAmount) || 0,
      paymentBasis: jobPayBasis,
      paymentMethod: jobPayMethod.trim(),
      acknowledgedWageRule: jobAckWageRule,
    };
    const err = validateWorkerRequestDraft(draft);
    if (err) {
      setFeedback({ type: 'err', text: err });
      return;
    }
    setBusy(true);
    try {
      await onCreateWorkerJob(draft);
      setJobTitle('');
      setJobDesc('');
      setJobAckWageRule(false);
      setFeedback({
        type: 'ok',
        text: 'Worker job published! Eligible workers can now browse and apply.',
      });
    } catch (e2: unknown) {
      setFeedback({
        type: 'err',
        text: e2 instanceof Error ? e2.message : 'Unable to publish worker job.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    setBusy(true);
    try {
      const res = await onUpdateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        country: country.trim(),
        state: stateName.trim(),
        lga: lga.trim(),
        townOrLocation: townOrFarmLocation.trim(),
        townOrFarmLocation: townOrFarmLocation.trim(),
        farmName: farmName.trim(),
        farmLocation: farmLocation.trim(),
        farmingType: farmingType.trim(),
        cropsOrLivestock: cropsOrLivestock.trim(),
        farmSize: farmSize.trim(),
        yearsOfExperience: yearsExp.trim(),
        farmDescription: farmDescription.trim(),
        governmentIdDocument: govId.trim(),
        profilePicture: profilePicture.trim(),
        farmPhotographs: farmPhotos
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        supportingDocuments: supportingDocs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setProfileNotice(
        res.reverificationTriggered
          ? 'Farmer profile updated. Legal name / ID changes re-queued Pending Verification.'
          : 'Farmer profile updated successfully.'
      );
    } catch (e2: unknown) {
      setProfileNotice(e2 instanceof Error ? e2.message : 'Failed to save Farmer profile.');
    } finally {
      setBusy(false);
    }
  };

  const myFarmerJobs = workerRequests.filter((j) => j.hirerId === user.id);

  return (
    <RoleDashboardShell
      role="Farmer"
      displayName={user.fullName}
      activeTab={primaryTab}
      onSelectTab={setPrimaryTab}
      unreadCount={unreadCount}
      onSignOut={onSignOut}
    >
      {primaryTab === 'Dashboard' && (
        <div className="space-y-6">
          <VerificationBanner
            role="Farmer"
            status={user.verificationStatus}
            notes={user.verificationNotes}
            onOpenProfile={() => setPrimaryTab('Profile')}
          />

          <div className="rounded-3xl border border-emerald-900/15 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#159B42]">
                  Farmer Workspace · {farmerProfile.farmName}
                </span>
                <h1 className="mt-1 font-display text-2xl font-bold text-[#243629]">
                  Welcome, {user.fullName}
                </h1>
                <p className="mt-1 text-xs text-[#718071]">
                  Discover sponsors for agricultural inputs or funding, manage separate direct
                  worker recruitment, and coordinate project supervision.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 rounded-2xl bg-[#F5F8F3] px-5 py-3 text-right">
                <div>
                  <p className="text-[11px] text-[#718071]">Sponsors Found</p>
                  <p className="font-mono text-lg font-bold text-[#243629] tabular-nums">
                    {sponsorProfiles.length}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718071]">Support Requests</p>
                  <p className="font-mono text-lg font-bold text-[#116B32] tabular-nums">
                    {supportRequests.length}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718071]">Active Agreements</p>
                  <p className="font-mono text-lg font-bold text-[#159B42] tabular-nums">
                    {sponsorAgreements.filter((a) => a.status === 'Active Agreement').length +
                      workerAgreements.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {(
                [
                  'Discover Sponsors',
                  'Request Support',
                  'Hire Farm Workers',
                  'Agreements & Supervision',
                  'Wallet',
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSubView(tab)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors duration-200 ${
                    subView === tab
                      ? 'bg-[#159B42] text-white'
                      : 'bg-[#F5F8F3] text-[#243629] hover:bg-[#EAF6EC]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {feedback && (
            <div
              role={feedback.type === 'err' ? 'alert' : 'status'}
              className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
                feedback.type === 'err'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-emerald-200 bg-[#EAF6EC] text-[#116B32]'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* 1. DISCOVER SPONSORS & INCOMING OFFERS */}
          {subView === 'Discover Sponsors' && (
            <div className="space-y-6">
              {sponsorOffers.length > 0 && (
                <section className="rounded-2xl border border-emerald-900/15 bg-white p-6">
                  <h2 className="text-base font-bold text-[#243629]">
                    Incoming Sponsor Offers ({sponsorOffers.length})
                  </h2>
                  <div className="mt-4 space-y-3">
                    {sponsorOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="rounded-2xl border border-slate-200 bg-[#F5F8F3] p-4 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-[#116B32]">
                            From {offer.sponsorName} ({offer.sponsorType})
                          </span>
                          <span className="font-mono font-bold text-[#243629]">
                            {offer.status}
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-bold text-[#243629]">{offer.title}</h3>
                        <p className="mt-1 text-[#243629]">
                          Contribution: {offer.fundingOrMaterialContribution} (₦
                          {offer.contributionValueNaira.toLocaleString('en-NG')}) ·{' '}
                          {offer.shareType}
                        </p>
                        <p className="mt-1 text-[#718071]">
                          Conditions: {offer.proposedConditions}
                        </p>
                        {offer.status === 'Sent' && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onRespondToSponsorOffer(offer.id, 'ACCEPT')}
                              className="rounded-xl bg-[#159B42] px-4 py-2 font-bold text-white hover:bg-[#116B32]"
                            >
                              Accept Offer Terms
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void onRespondToSponsorOffer(offer.id, 'REQUEST_INFO')
                              }
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-[#243629]"
                            >
                              Request More Info
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onRespondToSponsorOffer(offer.id, 'DECLINE')}
                              className="rounded-xl border border-red-200 bg-white px-4 py-2 font-bold text-red-700"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#718071]" />
                  <input
                    type="text"
                    value={sponsorSearch}
                    onChange={(e) => setSponsorSearch(e.target.value)}
                    placeholder="Search sponsors by name, location, or agricultural interest..."
                    className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-xs"
                  />
                </div>
                <select
                  aria-label="Filter sponsors by support category"
                  value={sponsorCatFilter}
                  onChange={(e) => setSponsorCatFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="All">All Support Categories</option>
                  {SUPPORT_CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {filteredSponsors.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-emerald-900/20 bg-white p-10 text-center">
                  <Handshake className="mx-auto h-8 w-8 text-[#159B42]" />
                  <h2 className="mt-3 text-base font-bold text-[#243629]">
                    No registered sponsors match your search yet
                  </h2>
                  <p className="mx-auto mt-1 max-w-md text-xs text-[#718071]">
                    Individual and Organisation Sponsors appear here once they join FarmFund. You
                    can also publish an open Farm Support Request under the Request Support tab.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredSponsors.map((sp) => {
                    const org = organisations.find((o) => o.userId === sp.userId);
                    return (
                      <div
                        key={sp.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {sp.profilePicture ? (
                                <img
                                  src={sp.profilePicture}
                                  alt={sp.fullName}
                                  className="h-11 w-11 rounded-xl object-cover"
                                />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF6EC] text-[#159B42]">
                                  {sp.sponsorType === 'organisation' ? (
                                    <Building2 className="h-5 w-5" />
                                  ) : (
                                    <User className="h-5 w-5" />
                                  )}
                                </div>
                              )}
                              <div>
                                <h3 className="text-sm font-bold text-[#243629]">{sp.fullName}</h3>
                                <p className="text-[11px] font-semibold text-[#116B32]">
                                  {sp.sponsorType === 'organisation'
                                    ? `Organisation Sponsor · ${org?.organisationType || 'Company'}`
                                    : 'Individual Sponsor'}{' '}
                                  · {sp.verificationStatus}
                                </p>
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 flex items-center gap-1 text-xs text-[#718071]">
                            <MapPin className="h-3.5 w-3.5 text-[#159B42]" />
                            <span>{sp.location}</span>
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-[#243629]">
                            {sp.description}
                          </p>
                          <div className="mt-3 rounded-xl bg-[#F5F8F3] p-3 text-[11px] text-[#718071]">
                            <p>
                              <strong className="text-[#243629]">Interests:</strong>{' '}
                              {sp.agriculturalInterests.join(', ') || 'General Agriculture'}
                            </p>
                            <p className="mt-1">
                              <strong className="text-[#243629]">Support Provided:</strong>{' '}
                              {sp.supportTypesProvided.join(', ') || 'Agricultural Support'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetSponsorId(sp.userId);
                              setTargetSponsorName(sp.fullName);
                              setSubView('Request Support');
                            }}
                            className="flex-1 rounded-xl bg-[#159B42] py-2 text-xs font-bold text-white hover:bg-[#116B32]"
                          >
                            Send Support Request
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrimaryTab('Messages')}
                            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-[#243629] hover:bg-[#EAF6EC]"
                          >
                            Message
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. REQUEST FARM SUPPORT FORM */}
          {subView === 'Request Support' && (
            <form
              onSubmit={handleSupportSubmit}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#243629]">
                    Request Agricultural Support From Sponsors
                  </h2>
                  <p className="text-xs text-[#718071]">
                    {targetSponsorName
                      ? `Targeted to Sponsor: ${targetSponsorName}`
                      : 'Open request visible to verified Sponsors on FarmFund'}
                  </p>
                </div>
                {targetSponsorId && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetSponsorId('');
                      setTargetSponsorName('');
                    }}
                    className="text-xs font-bold text-[#159B42] hover:underline"
                  >
                    Clear Target Sponsor
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold">Request Title *</label>
                  <input
                    type="text"
                    value={supTitle}
                    onChange={(e) => setSupTitle(e.target.value)}
                    placeholder="e.g. Dry Season Maize Irrigation & Fertiliser Support"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold">Support Category *</label>
                  <select
                    value={supAssistanceType}
                    onChange={(e) => setSupAssistanceType(e.target.value as AssistanceType)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                  >
                    {SUPPORT_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold">Funding Requested (₦)</label>
                  <input
                    type="number"
                    min="0"
                    value={supFundingAmount}
                    onChange={(e) => setSupFundingAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold">
                    Materials or Equipment Needed
                  </label>
                  <input
                    type="text"
                    value={supMaterials}
                    onChange={(e) => setSupMaterials(e.target.value)}
                    placeholder="e.g. 20 bags NPK fertiliser + drip tape"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold">Expected Farming Period *</label>
                  <input
                    type="text"
                    value={supFarmingPeriod}
                    onChange={(e) => setSupFarmingPeriod(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold">Expected Harvest Date *</label>
                  <input
                    type="date"
                    value={supHarvestDate}
                    onChange={(e) => setSupHarvestDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold">
                    Estimated Harvest or Farm Output *
                  </label>
                  <input
                    type="text"
                    value={supEstimatedOutput}
                    onChange={(e) => setSupEstimatedOutput(e.target.value)}
                    placeholder="e.g. 180 bags (100kg) dry yellow maize"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold">
                    Supporting Farm Documents / Photos
                  </label>
                  <input
                    type="text"
                    value={supDocsText}
                    onChange={(e) => setSupDocsText(e.target.value)}
                    placeholder="e.g. soil_test.pdf, farm_map.jpg"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold">
                  Project Description &amp; Purpose *
                </label>
                <textarea
                  rows={3}
                  value={supDescription}
                  onChange={(e) => setSupDescription(e.target.value)}
                  placeholder="Describe clearly how the requested funds or agricultural inputs will be utilised..."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              {/* Explicit Agreement Conditions & Optional 30% Arrangement */}
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs">
                <label className="block font-bold text-[#243629]">
                  Agreement Terms / Optional 30% Sponsor Share Basis (Never Applied Automatically)
                </label>
                <select
                  value={supShareModel}
                  onChange={(e) => setSupShareModel(e.target.value as ShareArrangementType)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="None (Standard Support)">
                    None (Standard Support Terms — No 30% Share)
                  </option>
                  <option value="30% Farm Produce Share">
                    30% Farm Produce Share (Explicit Basis: Eligible Produce Harvest)
                  </option>
                  <option value="30% Farm Funds Share">
                    30% Farm Funds Share (Explicit Basis: Eligible Net Farm Proceeds)
                  </option>
                </select>
                <p className="font-mono text-[11px] text-[#243629]">
                  Preview: {sharePreview.formattedSummary}
                </p>

                {supShareModel !== 'None (Standard Support)' && (
                  <label className="flex items-start gap-2 font-semibold text-amber-950">
                    <input
                      type="checkbox"
                      checked={supAckThirty}
                      onChange={(e) => setSupAckThirty(e.target.checked)}
                      className="mt-0.5 accent-[#159B42]"
                    />
                    <span>
                      I explicitly acknowledge that if accepted by both parties, the Sponsor
                      receives {supShareModel} calculated only on verified eligible output/proceeds
                      — never deducted on submission and never taken from worker wages.
                    </span>
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#159B42] px-6 py-3 text-xs font-bold text-white hover:bg-[#116B32]"
              >
                <Sprout className="h-4 w-4" />
                <span>Submit Support Request</span>
              </button>
            </form>
          )}

          {/* 3. SEPARATE WORKER RECRUITMENT WORKFLOW */}
          {subView === 'Hire Farm Workers' && (
            <div className="space-y-6">
              <form
                onSubmit={handlePublishJob}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="border-b border-slate-100 pb-3">
                  <span className="font-mono text-[11px] font-bold uppercase text-[#159B42]">
                    Direct Farm Labour Recruitment · 0% Sponsor Share Deduction
                  </span>
                  <h2 className="mt-1 text-base font-bold text-[#243629]">
                    Publish a Farm Worker Job
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold">Job Title *</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Maize Harvesting Team"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Work Category *</label>
                    <select
                      value={jobCategory}
                      onChange={(e) => setJobCategory(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                    >
                      {FARM_WORK_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  {jobCategory === 'Other agricultural work' && (
                    <div>
                      <label className="block text-xs font-semibold">Custom Work Category *</label>
                      <input
                        type="text"
                        value={jobCustomCat}
                        onChange={(e) => setJobCustomCat(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold">Farm Location *</label>
                    <input
                      type="text"
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Workers Needed *</label>
                    <input
                      type="number"
                      min="1"
                      value={jobWorkersNeeded}
                      onChange={(e) => setJobWorkersNeeded(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Agreed Wage (₦) *</label>
                    <input
                      type="number"
                      min="500"
                      value={jobPayAmount}
                      onChange={(e) => setJobPayAmount(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Payment Basis *</label>
                    <select
                      value={jobPayBasis}
                      onChange={(e) => setJobPayBasis(e.target.value as WorkerPaymentBasis)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                    >
                      <option value="Per Worker (Total Task)">Per Worker (Total Task)</option>
                      <option value="Per Worker (Daily)">Per Worker (Daily)</option>
                      <option value="Agreed Total Team Payment">Agreed Total Team Payment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Payment Method *</label>
                    <input
                      type="text"
                      value={jobPayMethod}
                      onChange={(e) => setJobPayMethod(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Start Date *</label>
                    <input
                      type="date"
                      value={jobStartDate}
                      onChange={(e) => setJobStartDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Expected Duration *</label>
                    <input
                      type="text"
                      value={jobDuration}
                      onChange={(e) => setJobDuration(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Working Hours *</label>
                    <input
                      type="text"
                      value={jobHours}
                      onChange={(e) => setJobHours(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Required Skills *</label>
                    <input
                      type="text"
                      value={jobSkills}
                      onChange={(e) => setJobSkills(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold">Job Description *</label>
                  <textarea
                    rows={2}
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <label className="flex items-start gap-2 rounded-xl border border-emerald-900/15 bg-[#EAF6EC] p-3 text-xs font-semibold text-[#116B32]">
                  <input
                    type="checkbox"
                    checked={jobAckWageRule}
                    onChange={(e) => setJobAckWageRule(e.target.checked)}
                    className="mt-0.5 accent-[#159B42]"
                  />
                  <span>
                    I confirm workers receive 100% of their agreed wages directly with 0% sponsor
                    share deduction.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#159B42] px-6 py-3 text-xs font-bold text-white hover:bg-[#116B32]"
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Publish Worker Job</span>
                </button>
              </form>

              {/* Incoming Worker Applications & Wage Confirmation */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-[#243629]">
                  Published Jobs ({myFarmerJobs.length}) &amp; Worker Applications (
                  {workerApplications.length})
                </h3>
                {myFarmerJobs.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {myFarmerJobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-xl border border-emerald-900/10 bg-[#F5F8F3] px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 font-bold text-[#243629]">
                          <span>{job.jobTitle}</span>
                          <span className="font-mono text-[#116B32]">{job.status}</span>
                        </div>
                        <p className="mt-0.5 text-[#718071]">
                          {job.workCategory} · ₦{job.paymentAmountNaira.toLocaleString('en-NG')} (
                          {job.paymentBasis}) · Hired {job.workersHired}/{job.workersNeeded}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {workerApplications.length === 0 ? (
                  <p className="mt-3 text-xs text-[#718071]">
                    No worker applications received yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {workerApplications.map((app) => (
                      <div
                        key={app.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#243629]">
                            {app.workerName} · {app.jobTitle}
                          </p>
                          <p className="text-[#718071]">
                            Skills: {app.workerSkills} · Proposed Wage: ₦
                            {app.proposedWageNaira.toLocaleString('en-NG')}
                          </p>
                          <p className="mt-1 italic text-[#718071]">&ldquo;{app.message}&rdquo;</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#116B32]">{app.status}</span>
                          {app.status === 'Applied' && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void onRespondToWorkerApp(app.id, 'HIRE')}
                                className="rounded-lg bg-[#159B42] px-3 py-1.5 font-bold text-white"
                              >
                                Hire Worker
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void onRespondToWorkerApp(app.id, 'DECLINE')}
                                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 font-bold text-red-700"
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {workerPayments.length > 0 && (
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-bold text-[#243629]">
                      Worker Wage Settlements (0% Sponsor Deduction)
                    </h4>
                    {workerPayments.map((pay) => (
                      <div
                        key={pay.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F5F8F3] p-3 text-xs"
                      >
                        <span>
                          <strong>{pay.workerName}</strong> · {pay.jobTitle} · ₦
                          {pay.amountNaira.toLocaleString('en-NG')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#116B32]">{pay.status}</span>
                          {pay.status === 'Pending Work Completion' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onInitiateWorkerWagePayment(pay.id)}
                              className="rounded-lg bg-[#159B42] px-3 py-1 font-bold text-white"
                            >
                              Confirm Work &amp; Pay Worker
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* 4. SUPPORT REQUESTS, AGREEMENTS & SUPERVISION */}
          {subView === 'Agreements & Supervision' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-base font-bold text-[#243629]">
                  My Support Requests ({supportRequests.length}) &amp; Support Agreements (
                  {sponsorAgreements.length})
                </h2>
                {supportRequests.length === 0 && sponsorAgreements.length === 0 ? (
                  <p className="mt-3 text-xs text-[#718071]">
                    Submit a Support Request or accept a Sponsor Offer to track agreements here.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {supportRequests.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#243629]">{r.title}</p>
                          <p className="text-[#718071]">
                            {r.assistanceType} · ₦{r.fundingAmount.toLocaleString('en-NG')} ·{' '}
                            {r.preferredShareModel}
                          </p>
                        </div>
                        <span className="rounded-md bg-[#EAF6EC] px-2.5 py-1 font-mono font-bold text-[#116B32]">
                          {r.status}
                        </span>
                      </div>
                    ))}
                    {sponsorAgreements.map((agr) => (
                      <div
                        key={agr.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-[#F5F8F3] p-4 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#243629]">
                            {agr.requestTitle} — Sponsor: {agr.sponsorName}
                          </p>
                          <p className="text-[#718071]">
                            {agr.sponsorContribution} · {agr.shareType} ({agr.status})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenAgreementModal(agr)}
                          className="rounded-xl bg-[#159B42] px-4 py-2 font-bold text-white hover:bg-[#116B32]"
                        >
                          {agr.farmerAccepted ? 'View Agreement' : 'Review & Accept Agreement'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Request Supervision Invitation */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-[#159B42]" />
                  <h2 className="text-base font-bold text-[#243629]">
                    Invite a Supervisor to an Accepted Agreement
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#718071]">
                  Supervisors only gain visibility to accepted agreements when explicitly invited
                  and assigned here.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <select
                    value={supAgrId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSupAgrId(val);
                      if (val.startsWith('wagr_')) {
                        setSupCategory('Farmer & Worker Hiring Agreement');
                      } else {
                        setSupCategory('Sponsor & Farmer Support Agreement');
                      }
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">Select Active Agreement...</option>
                    {sponsorAgreements
                      .filter((a) => a.status === 'Active Agreement')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          Support: {a.requestTitle}
                        </option>
                      ))}
                    {workerAgreements
                      .filter((a) => a.status === 'Active Work')
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          Worker Job: {w.jobTitle} ({w.workerName})
                        </option>
                      ))}
                  </select>

                  <select
                    value={invitedSupervisorId}
                    onChange={(e) => setInvitedSupervisorId(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">Select Registered Supervisor...</option>
                    {supervisorProfiles.map((sv) => (
                      <option key={sv.userId} value={sv.userId}>
                        {sv.fullName} ({sv.verificationStatus})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={supInstructions}
                    onChange={(e) => setSupInstructions(e.target.value)}
                    placeholder="Supervision scope / milestone instructions"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={busy || !supAgrId || !invitedSupervisorId}
                  onClick={() =>
                    void onRequestSupervision({
                      agreementId: supAgrId,
                      agreementCategory: supCategory,
                      invitedSupervisorId,
                      supervisionInstructions: supInstructions,
                    })
                  }
                  className="mt-3 rounded-xl bg-[#159B42] px-4 py-2 text-xs font-bold text-white hover:bg-[#116B32] disabled:opacity-50"
                >
                  Send Supervision Invitation
                </button>

                {supervisionReports.length > 0 && (
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                    <h3 className="text-xs font-bold text-[#243629]">
                      Supervisor Inspection Reports ({supervisionReports.length})
                    </h3>
                    {supervisionReports.map((rep) => (
                      <div
                        key={rep.id}
                        className="rounded-xl border border-slate-200 bg-[#F5F8F3] p-3 text-xs"
                      >
                        <div className="flex justify-between font-bold text-[#116B32]">
                          <span>
                            {rep.reportType} · {rep.supervisorName}
                          </span>
                          <span className="font-mono">{rep.createdAt.slice(0, 10)}</span>
                        </div>
                        <p className="mt-1 font-semibold text-[#243629]">{rep.summary}</p>
                        <p className="text-[#718071]">{rep.observations}</p>
                      </div>
                    ))}
                  </div>
                )}

                {supervisionRequests.length > 0 && (
                  <p className="mt-3 text-[11px] text-[#718071]">
                    Invitations sent: {supervisionRequests.length} · Accepted assignments:{' '}
                    {supervisionAssignments.length}
                  </p>
                )}
              </section>
            </div>
          )}

          {/* 5. EMBEDDED STELLAR WALLET */}
          {subView === 'Wallet' && (
            <StellarWalletDashboard
              userId={user.id}
              userName={user.fullName}
              role="Farmer"
              supportRequests={supportRequests}
              workerRequests={myFarmerJobs}
            />
          )}
        </div>
      )}

      {primaryTab === 'Messages' && (
        <MessagingCenter
          currentUserId={user.id}
          currentUserRole="Farmer"
          conversations={conversations}
          messages={messages}
          notifications={notifications}
          availableRecipients={availableRecipients}
          onSendMessage={onSendMessage}
          onMarkConversationRead={onMarkConversationRead}
        />
      )}

      {primaryTab === 'Profile' && (
        <div className="space-y-5">
          <VerificationBanner
            role="Farmer"
            status={user.verificationStatus}
            notes={user.verificationNotes}
          />
          <form
            onSubmit={handleSaveProfile}
            className="space-y-5 rounded-3xl border border-emerald-900/15 bg-white p-6 sm:p-8"
          >
            <div className="border-b border-slate-100 pb-4">
              <h2 className="font-display text-xl font-bold text-[#243629]">
                Farmer Profile &amp; Farm Details ({farmerProfile.verificationStatus})
              </h2>
              <p className="mt-1 text-xs text-[#718071]">
                Updating your legal name or government ID re-triggers Pending Verification until an
                Admin approves it.
              </p>
            </div>
            {profileNotice && (
              <div className="rounded-xl border border-emerald-200 bg-[#EAF6EC] px-4 py-3 text-xs font-bold text-[#116B32]">
                {profileNotice}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">State</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">LGA</label>
                <input
                  type="text"
                  value={lga}
                  onChange={(e) => setLga(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Town / Location</label>
                <input
                  type="text"
                  value={townOrFarmLocation}
                  onChange={(e) => setTownOrFarmLocation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Farm Name</label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Farm Location</label>
                <input
                  type="text"
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Farming Type</label>
                <input
                  type="text"
                  value={farmingType}
                  onChange={(e) => setFarmingType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Crops or Livestock</label>
                <input
                  type="text"
                  value={cropsOrLivestock}
                  onChange={(e) => setCropsOrLivestock(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Farm Size</label>
                <input
                  type="text"
                  value={farmSize}
                  onChange={(e) => setFarmSize(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Years of Experience</label>
                <input
                  type="text"
                  value={yearsExp}
                  onChange={(e) => setYearsExp(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Government ID Document</label>
                <input
                  type="text"
                  value={govId}
                  onChange={(e) => setGovId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Profile Picture Reference</label>
                <input
                  type="text"
                  value={profilePicture}
                  onChange={(e) => setProfilePicture(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Farm Photographs</label>
                <input
                  type="text"
                  value={farmPhotos}
                  onChange={(e) => setFarmPhotos(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Supporting Documents</label>
                <input
                  type="text"
                  value={supportingDocs}
                  onChange={(e) => setSupportingDocs(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold">Farm Description</label>
              <textarea
                rows={3}
                value={farmDescription}
                onChange={(e) => setFarmDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#159B42] px-6 py-3 text-xs font-bold text-white hover:bg-[#116B32]"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Save Farmer Profile</span>
            </button>
          </form>
        </div>
      )}
    </RoleDashboardShell>
  );
};

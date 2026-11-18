import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Handshake,
  Search,
  Sprout,
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
  WorkerProfile,
  WorkerRequest,
} from '../types/farmfund';
import { validateWorkerRequestDraft } from '../utils/farmfundLogic';
import { PrimaryRoleTab, RoleDashboardShell } from './RoleDashboardShell';
import { VerificationBanner } from './VerificationBanner';
import { MessageRecipientOption, MessagingCenter } from './MessagingCenter';
import { StellarWalletDashboard } from './StellarWalletDashboard';

interface SponsorDashboardProps {
  user: PlatformUser;
  sponsorProfile: SponsorProfile;
  organisationProfile?: OrganisationProfile;
  farmerProfiles: FarmerProfile[];
  workerProfiles: WorkerProfile[];
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
  onSendOfferToFarmer: (draft: {
    farmerId: string;
    title: string;
    supportCategory: AssistanceType;
    fundingOrMaterialContribution: string;
    contributionValueNaira: number;
    proposedConditions: string;
    usesThirtyPercentShare: boolean;
    shareType: ShareArrangementType;
    supervisionRecommended: boolean;
  }) => Promise<void>;
  onRespondToSupportRequest: (
    requestId: string,
    action: 'ACCEPT_AND_DRAFT_AGREEMENT' | 'DECLINE' | 'REQUEST_INFO',
    note?: string,
    supervisionRequired?: boolean
  ) => Promise<void>;
  onOpenAgreementModal: (agreement: SponsorFundingAgreement) => void;
  onPublishWorkerJob: (draft: Partial<WorkerRequest>) => Promise<void>;
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
  onUpdateProfile: (
    profilePatch: Record<string, unknown>,
    organisationPatch?: Record<string, unknown>
  ) => Promise<{ reverificationTriggered: boolean }>;
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

export const SponsorDashboard: React.FC<SponsorDashboardProps> = ({
  user,
  sponsorProfile,
  organisationProfile,
  farmerProfiles,
  workerProfiles,
  supervisorProfiles,
  supportRequests,
  sponsorOffers,
  sponsorAgreements,
  workerRequests,
  workerApplications,
  workerAgreements,
  workerPayments,
  supervisionAssignments,
  supervisionReports,
  conversations,
  messages,
  notifications,
  unreadCount,
  onSendOfferToFarmer,
  onRespondToSupportRequest,
  onOpenAgreementModal,
  onPublishWorkerJob,
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
    | 'Discover Farmers & Workers'
    | 'Farmer Requests & Offers'
    | 'Jobs & Applications'
    | 'Agreements & Supervision'
    | 'Wallet'
  >('Discover Farmers & Workers');

  // Discover search
  const [discoveryQuery, setDiscoveryQuery] = useState('');

  // Send Support Offer Modal / Inline Composer
  const [offerFarmerId, setOfferFarmerId] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerCat, setOfferCat] = useState<AssistanceType>('Financial Support');
  const [offerContrib, setOfferContrib] = useState('');
  const [offerValueNaira, setOfferValueNaira] = useState('500000');
  const [offerConditions, setOfferConditions] = useState(
    'Milestone-based support disbursement with monthly field progress updates.'
  );
  const [offerUsesThirty, setOfferUsesThirty] = useState(false);
  const [offerShareType, setOfferShareType] = useState<ShareArrangementType>(
    '30% Farm Produce Share'
  );
  const [offerSupervision, setOfferSupervision] = useState(true);

  // Publish Worker Job Form
  const [jobTitle, setJobTitle] = useState('');
  const [jobCat, setJobCat] = useState<string>(FARM_WORK_CATEGORIES[0]);
  const [jobLocation, setJobLocation] = useState('');
  const [jobWorkersNeeded, setJobWorkersNeeded] = useState('4');
  const [jobPay, setJobPay] = useState('12000');
  const [jobBasis, setJobBasis] = useState<WorkerPaymentBasis>('Per Worker (Total Task)');
  const [jobStartDate, setJobStartDate] = useState('2026-12-01');
  const [jobDuration, setJobDuration] = useState('5 Days');
  const [jobHours, setJobHours] = useState('7:00 AM - 3:00 PM');
  const [jobSkills, setJobSkills] = useState('Crop harvesting & sorting');
  const [jobDesc, setJobDesc] = useState('');
  const [jobAckWage, setJobAckWage] = useState(false);

  // Supervision Invitation State
  const [supAgrId, setSupAgrId] = useState('');
  const [supCategory, setSupCategory] = useState<SupervisionRequest['agreementCategory']>(
    'Sponsor & Farmer Support Agreement'
  );
  const [invitedSupervisorId, setInvitedSupervisorId] = useState('');
  const [supInstructions, setSupInstructions] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Editable Profile State (Individual vs Organisation)
  const isOrg = sponsorProfile.sponsorType === 'organisation';
  const [fullName, setFullName] = useState(sponsorProfile.fullName);
  const [phone, setPhone] = useState(sponsorProfile.phone);
  const [location, setLocation] = useState(sponsorProfile.location);
  const [description, setDescription] = useState(sponsorProfile.description);
  const [interestsText, setInterestsText] = useState(
    (sponsorProfile.agriculturalInterests || []).join(', ')
  );
  const [supportCats, setSupportCats] = useState<string[]>(
    sponsorProfile.supportTypesProvided || []
  );
  const [socialLinks, setSocialLinks] = useState(sponsorProfile.socialMediaLinks || '');
  const [govId, setGovId] = useState(sponsorProfile.governmentIdDocument);
  const [profilePic, setProfilePic] = useState(sponsorProfile.profilePicture);

  // Org fields
  const [orgName, setOrgName] = useState(organisationProfile?.organisationName || fullName);
  const [officeAddr, setOfficeAddr] = useState(organisationProfile?.officeAddress || '');
  const [website, setWebsite] = useState(organisationProfile?.website || '');
  const [orgType, setOrgType] = useState(organisationProfile?.organisationType || '');
  const [repName, setRepName] = useState(organisationProfile?.representativeName || '');
  const [repPosition, setRepPosition] = useState(organisationProfile?.representativePosition || '');
  const [regDocs, setRegDocs] = useState(
    (organisationProfile?.registrationDocuments || []).join(', ')
  );
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const filteredFarmers = useMemo(() => {
    const q = discoveryQuery.trim().toLowerCase();
    return farmerProfiles.filter(
      (f) =>
        !q ||
        f.fullName.toLowerCase().includes(q) ||
        f.farmName.toLowerCase().includes(q) ||
        f.farmLocation.toLowerCase().includes(q) ||
        f.cropsOrLivestock.toLowerCase().includes(q)
    );
  }, [farmerProfiles, discoveryQuery]);

  const filteredWorkers = useMemo(() => {
    const q = discoveryQuery.trim().toLowerCase();
    return workerProfiles.filter(
      (w) =>
        !q ||
        w.fullName.toLowerCase().includes(q) ||
        w.location.toLowerCase().includes(q) ||
        w.skills.join(' ').toLowerCase().includes(q)
    );
  }, [workerProfiles, discoveryQuery]);

  const availableRecipients = useMemo<MessageRecipientOption[]>(() => {
    const map = new Map<string, MessageRecipientOption>();
    for (const f of farmerProfiles) {
      map.set(f.userId, {
        id: f.userId,
        name: f.fullName,
        role: 'Farmer',
        contextTitle: f.farmName,
        contextType: 'Support',
      });
    }
    for (const w of workerProfiles) {
      map.set(w.userId, {
        id: w.userId,
        name: w.fullName,
        role: 'Worker',
        contextTitle: 'Farm Labour Hiring',
        contextType: 'Job',
      });
    }
    for (const a of supervisionAssignments) {
      map.set(a.supervisorId, {
        id: a.supervisorId,
        name: a.supervisorName,
        role: 'Supervisor',
        contextTitle: a.projectTitle,
        contextType: 'Supervision',
      });
    }
    return Array.from(map.values());
  }, [farmerProfiles, workerProfiles, supervisionAssignments]);

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!offerFarmerId || !offerTitle.trim() || !offerContrib.trim()) {
      setFeedback({
        type: 'err',
        text: 'Select a farmer and enter offer title and contribution details.',
      });
      return;
    }
    setBusy(true);
    try {
      await onSendOfferToFarmer({
        farmerId: offerFarmerId,
        title: offerTitle.trim(),
        supportCategory: offerCat,
        fundingOrMaterialContribution: offerContrib.trim(),
        contributionValueNaira: Number(offerValueNaira) || 0,
        proposedConditions: offerConditions.trim(),
        usesThirtyPercentShare: offerUsesThirty,
        shareType: offerUsesThirty ? offerShareType : 'None (Standard Support)',
        supervisionRecommended: offerSupervision,
      });
      setOfferFarmerId('');
      setOfferTitle('');
      setOfferContrib('');
      setFeedback({ type: 'ok', text: 'Support offer sent directly to farmer for review.' });
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to send offer.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePublishJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const draft: Partial<WorkerRequest> = {
      jobTitle: jobTitle.trim(),
      workCategory: jobCat,
      customWorkCategory: '',
      description: jobDesc.trim(),
      location: jobLocation.trim(),
      workersNeeded: Number(jobWorkersNeeded) || 1,
      requiredSkills: jobSkills.trim(),
      startDate: jobStartDate,
      expectedDuration: jobDuration.trim(),
      workingHours: jobHours.trim(),
      paymentAmountNaira: Number(jobPay) || 0,
      paymentBasis: jobBasis,
      paymentMethod: 'Embedded Stellar USDC Wallet',
      acknowledgedWageRule: jobAckWage,
    };
    const err = validateWorkerRequestDraft(draft);
    if (err) {
      setFeedback({ type: 'err', text: err });
      return;
    }
    setBusy(true);
    try {
      await onPublishWorkerJob(draft);
      setJobTitle('');
      setJobDesc('');
      setJobAckWage(false);
      setFeedback({ type: 'ok', text: 'Sponsored farm job published for registered workers.' });
    } catch (e2: unknown) {
      setFeedback({
        type: 'err',
        text: e2 instanceof Error ? e2.message : 'Unable to publish job.',
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
      const res = await onUpdateProfile(
        {
          fullName: isOrg ? orgName.trim() : fullName.trim(),
          phone: phone.trim(),
          location: location.trim(),
          description: description.trim(),
          agriculturalInterests: interestsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          supportTypesProvided: supportCats,
          socialMediaLinks: socialLinks.trim(),
          governmentIdDocument: govId.trim(),
          profilePicture: profilePic.trim(),
        },
        isOrg
          ? {
              organisationName: orgName.trim(),
              phone: phone.trim(),
              officeAddress: officeAddr.trim(),
              location: location.trim(),
              website: website.trim(),
              organisationType: orgType.trim(),
              representativeName: repName.trim(),
              representativePosition: repPosition.trim(),
              description: description.trim(),
              registrationDocuments: regDocs
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : undefined
      );
      setProfileNotice(
        res.reverificationTriggered
          ? 'Sponsor profile updated. Name / identity updates re-queued Pending Verification.'
          : 'Sponsor profile saved successfully.'
      );
    } catch (e2: unknown) {
      setProfileNotice(e2 instanceof Error ? e2.message : 'Unable to save profile.');
    } finally {
      setBusy(false);
    }
  };

  const myPostedJobs = workerRequests.filter((w) => w.hirerId === user.id);

  return (
    <RoleDashboardShell
      role="Sponsor"
      sponsorType={sponsorProfile.sponsorType}
      displayName={user.fullName}
      activeTab={primaryTab}
      onSelectTab={setPrimaryTab}
      unreadCount={unreadCount}
      onSignOut={onSignOut}
    >
      {primaryTab === 'Dashboard' && (
        <div className="space-y-6">
          <VerificationBanner
            role="Sponsor"
            status={user.verificationStatus}
            notes={user.verificationNotes}
            onOpenProfile={() => setPrimaryTab('Profile')}
          />

          <div className="rounded-3xl border border-emerald-900/15 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#159B42]">
                  {isOrg && <Building2 className="h-3.5 w-3.5" />}
                  <span>
                    {isOrg ? 'Company / Organisation Sponsor Desk' : 'Individual Sponsor Desk'}
                  </span>
                </div>
                <h1 className="mt-1 font-display text-2xl font-bold text-[#243629]">
                  Welcome, {user.fullName}
                </h1>
                <p className="mt-1 text-xs text-[#718071]">
                  Discover farmers and workers, respond to support requests, publish direct farm
                  work opportunities, coordinate supervision, and fund escrows via Stellar USDC.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 rounded-2xl bg-[#F5F8F3] px-5 py-3 text-right">
                <div>
                  <p className="text-[11px] text-[#718071]">Farmers</p>
                  <p className="font-mono text-lg font-bold text-[#243629] tabular-nums">
                    {farmerProfiles.length}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718071]">Support Requests</p>
                  <p className="font-mono text-lg font-bold text-[#116B32] tabular-nums">
                    {supportRequests.length}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718071]">Agreements</p>
                  <p className="font-mono text-lg font-bold text-[#159B42] tabular-nums">
                    {sponsorAgreements.length + workerAgreements.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {(
                [
                  'Discover Farmers & Workers',
                  'Farmer Requests & Offers',
                  'Jobs & Applications',
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

          {/* 1. DISCOVER FARMERS & WORKERS + SEND SUPPORT OFFER */}
          {subView === 'Discover Farmers & Workers' && (
            <div className="space-y-6">
              <div className="relative rounded-2xl border border-slate-200 bg-white p-4">
                <Search className="pointer-events-none absolute top-7 left-7 h-4 w-4 text-[#718071]" />
                <input
                  type="text"
                  value={discoveryQuery}
                  onChange={(e) => setDiscoveryQuery(e.target.value)}
                  placeholder="Search available Farmers or Workers by location, crops, or skills..."
                  className="w-full rounded-xl border border-slate-300 py-2.5 pr-4 pl-10 text-xs"
                />
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-[#159B42]" />
                  <h2 className="text-base font-bold text-[#243629]">
                    Registered Farmers ({filteredFarmers.length})
                  </h2>
                </div>
                {filteredFarmers.length === 0 ? (
                  <p className="mt-3 text-xs text-[#718071]">
                    No farmers registered yet. Verified and pending farmer profiles appear here as
                    soon as farmers join FarmFund.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredFarmers.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-2xl border border-slate-200 bg-[#F5F8F3] p-4 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-[#243629]">{f.farmName}</h3>
                          <span className="font-mono text-[11px] font-bold text-[#116B32]">
                            {f.verificationStatus}
                          </span>
                        </div>
                        <p className="mt-1 text-[#718071]">
                          Farmer: {f.fullName} · {f.farmLocation} · {f.farmSize}
                        </p>
                        <p className="mt-1 text-[#243629]">
                          {f.farmingType} ({f.cropsOrLivestock})
                        </p>
                        <p className="mt-1.5 text-[#718071]">{f.farmDescription}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setOfferFarmerId(f.userId)}
                            className="rounded-xl bg-[#159B42] px-3.5 py-2 font-bold text-white hover:bg-[#116B32]"
                          >
                            Send Support Offer
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrimaryTab('Messages')}
                            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-bold text-[#243629]"
                          >
                            Message
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {offerFarmerId && (
                <form
                  onSubmit={handleSendOffer}
                  className="space-y-4 rounded-2xl border border-[#159B42] bg-[#EAF6EC] p-6 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#116B32]">
                      Propose Agricultural Support Offer
                    </h3>
                    <button
                      type="button"
                      onClick={() => setOfferFarmerId('')}
                      className="font-bold text-[#243629]"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      placeholder="Offer title (e.g. Hybrid Seeds + Irrigation Package)"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2"
                    />
                    <select
                      value={offerCat}
                      onChange={(e) => setOfferCat(e.target.value as AssistanceType)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2"
                    >
                      {SUPPORT_CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={offerContrib}
                      onChange={(e) => setOfferContrib(e.target.value)}
                      placeholder="Funding or material contribution description"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2"
                    />
                    <input
                      type="number"
                      value={offerValueNaira}
                      onChange={(e) => setOfferValueNaira(e.target.value)}
                      placeholder="Estimated value (₦)"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={offerConditions}
                    onChange={(e) => setOfferConditions(e.target.value)}
                    placeholder="Proposed conditions..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 font-semibold">
                      <input
                        type="checkbox"
                        checked={offerUsesThirty}
                        onChange={(e) => setOfferUsesThirty(e.target.checked)}
                        className="accent-[#159B42]"
                      />
                      <span>Include Explicit 30% Share Model</span>
                    </label>
                    {offerUsesThirty && (
                      <select
                        value={offerShareType}
                        onChange={(e) => setOfferShareType(e.target.value as ShareArrangementType)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5"
                      >
                        <option value="30% Farm Produce Share">30% Farm Produce Share</option>
                        <option value="30% Farm Funds Share">30% Farm Funds Share</option>
                      </select>
                    )}
                    <label className="flex items-center gap-2 font-semibold">
                      <input
                        type="checkbox"
                        checked={offerSupervision}
                        onChange={(e) => setOfferSupervision(e.target.checked)}
                        className="accent-[#159B42]"
                      />
                      <span>Recommend Project Supervision</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-[#159B42] px-5 py-2.5 font-bold text-white hover:bg-[#116B32]"
                  >
                    Send Support Offer to Farmer
                  </button>
                </form>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#159B42]" />
                  <h2 className="text-base font-bold text-[#243629]">
                    Available Farm Workers ({filteredWorkers.length})
                  </h2>
                </div>
                {filteredWorkers.length === 0 ? (
                  <p className="mt-3 text-xs text-[#718071]">
                    No registered workers available yet.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredWorkers.map((w) => (
                      <div
                        key={w.id}
                        className="rounded-2xl border border-slate-200 p-4 text-xs"
                      >
                        <div className="flex justify-between font-bold text-[#243629]">
                          <span>{w.fullName}</span>
                          <span className="font-mono text-[#116B32]">{w.verificationStatus}</span>
                        </div>
                        <p className="mt-1 text-[#718071]">
                          {w.location} · Skills: {w.skills.join(', ')}
                        </p>
                        <p className="mt-1 text-[#243629]">
                          Rate: ₦{w.expectedWageNaira.toLocaleString('en-NG')} ({w.wageUnit})
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* 2. INCOMING FARMER SUPPORT REQUESTS & SENT OFFERS */}
          {subView === 'Farmer Requests & Offers' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-[#159B42]" />
                  <h2 className="text-base font-bold text-[#243629]">
                    Incoming Farmer Support Requests ({supportRequests.length})
                  </h2>
                </div>
                {supportRequests.length === 0 ? (
                  <p className="mt-3 text-xs text-[#718071]">
                    No farm support requests submitted by farmers yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {supportRequests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-slate-200 bg-[#F5F8F3] p-4 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono font-bold text-[#159B42]">
                            {req.assistanceType} · {req.preferredShareModel}
                          </span>
                          <span className="font-mono font-bold text-[#243629]">{req.status}</span>
                        </div>
                        <h3 className="mt-1 text-sm font-bold text-[#243629]">{req.title}</h3>
                        <p className="mt-1 text-[#718071]">
                          {req.farmerName} ({req.farmName}) · {req.location} · Funding Requested: ₦
                          {req.fundingAmount.toLocaleString('en-NG')}
                        </p>
                        <p className="mt-1 text-[#243629]">{req.description}</p>
                        {(req.status === 'Open' || req.status === 'More Information Requested') && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void onRespondToSupportRequest(
                                  req.id,
                                  'ACCEPT_AND_DRAFT_AGREEMENT',
                                  'Sponsor approved terms for dual acceptance.',
                                  true
                                )
                              }
                              className="rounded-xl bg-[#159B42] px-4 py-2 font-bold text-white hover:bg-[#116B32]"
                            >
                              Accept &amp; Propose Agreement
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void onRespondToSupportRequest(
                                  req.id,
                                  'REQUEST_INFO',
                                  'Please provide land size & input unit cost breakdown.'
                                )
                              }
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-[#243629]"
                            >
                              Request More Info
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void onRespondToSupportRequest(
                                  req.id,
                                  'DECLINE',
                                  'Outside current funding window.'
                                )
                              }
                              className="rounded-xl border border-red-200 bg-white px-4 py-2 font-bold text-red-700"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-base font-bold text-[#243629]">
                  Support Offers Sent ({sponsorOffers.length})
                </h2>
                {sponsorOffers.length === 0 ? (
                  <p className="mt-2 text-xs text-[#718071]">
                    No direct support offers sent yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2 text-xs">
                    {sponsorOffers.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                      >
                        <span>
                          <strong>{o.title}</strong> → {o.farmerName}
                        </span>
                        <span className="font-mono font-bold text-[#116B32]">{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* 3. PUBLISH FARM WORK OPPORTUNITIES & REVIEW APPLICATIONS */}
          {subView === 'Jobs & Applications' && (
            <div className="space-y-6">
              <form
                onSubmit={handlePublishJobSubmit}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="border-b border-slate-100 pb-3">
                  <span className="font-mono text-[11px] font-bold uppercase text-[#159B42]">
                    Direct Labour Hiring · 0% Sponsor Share Deduction
                  </span>
                  <h2 className="mt-1 text-base font-bold text-[#243629]">
                    Publish Farm Job for Workers
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold">Job Title *</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Sponsored Maize Harvest Crew"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Work Category *</label>
                    <select
                      value={jobCat}
                      onChange={(e) => setJobCat(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                    >
                      {FARM_WORK_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Location *</label>
                    <input
                      type="text"
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      placeholder="Farm location"
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
                    <label className="block text-xs font-semibold">Wage per Worker (₦) *</label>
                    <input
                      type="number"
                      min="500"
                      value={jobPay}
                      onChange={(e) => setJobPay(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Payment Basis *</label>
                    <select
                      value={jobBasis}
                      onChange={(e) => setJobPayBasisIfNeeded(e.target.value as WorkerPaymentBasis)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                    >
                      <option value="Per Worker (Total Task)">Per Worker (Total Task)</option>
                      <option value="Per Worker (Daily)">Per Worker (Daily)</option>
                      <option value="Agreed Total Team Payment">Agreed Total Team Payment</option>
                    </select>
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
                    checked={jobAckWage}
                    onChange={(e) => setJobAckWage(e.target.checked)}
                    className="mt-0.5 accent-[#159B42]"
                  />
                  <span>
                    I confirm hired workers receive 100% of agreed wages with 0% sponsor deduction.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-2xl bg-[#159B42] px-6 py-3 text-xs font-bold text-white hover:bg-[#116B32]"
                >
                  Publish Job Opportunity
                </button>
              </form>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-[#243629]">
                  Published Jobs ({myPostedJobs.length}) &amp; Applications (
                  {workerApplications.length})
                </h3>
                {myPostedJobs.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {myPostedJobs.map((job) => (
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
                  <p className="mt-2 text-xs text-[#718071]">
                    No worker applications received on your published jobs yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {workerApplications.map((app) => (
                      <div
                        key={app.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#243629]">
                            {app.workerName} · {app.jobTitle}
                          </p>
                          <p className="text-[#718071]">
                            Proposed: ₦{app.proposedWageNaira.toLocaleString('en-NG')} ·{' '}
                            {app.workerSkills}
                          </p>
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
                                Hire
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
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {workerPayments.map((pay) => (
                      <div
                        key={pay.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F5F8F3] p-3 text-xs"
                      >
                        <span>
                          <strong>{pay.workerName}</strong> · ₦
                          {pay.amountNaira.toLocaleString('en-NG')} ({pay.status})
                        </span>
                        {pay.status === 'Pending Work Completion' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onInitiateWorkerWagePayment(pay.id)}
                            className="rounded-lg bg-[#159B42] px-3 py-1 font-bold text-white"
                          >
                            Confirm Work &amp; Pay Wage
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* 4. AGREEMENTS, SUPERVISION REQUESTS & INSPECTION REPORTS */}
          {subView === 'Agreements & Supervision' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-base font-bold text-[#243629]">
                  Accepted &amp; Pending Support Agreements ({sponsorAgreements.length})
                </h2>
                {sponsorAgreements.length === 0 ? (
                  <p className="mt-2 text-xs text-[#718071]">
                    No support agreements recorded yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {sponsorAgreements.map((agr) => (
                      <div
                        key={agr.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#F5F8F3] p-4 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#243629]">
                            {agr.requestTitle} · Farmer: {agr.farmerName}
                          </p>
                          <p className="text-[#718071]">
                            {agr.sponsorContribution} · {agr.shareType} · Status: {agr.status}
                            {agr.assignedSupervisorName
                              ? ` · Supervisor: ${agr.assignedSupervisorName}`
                              : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenAgreementModal(agr)}
                          className="rounded-xl bg-[#159B42] px-4 py-2 font-bold text-white hover:bg-[#116B32]"
                        >
                          View Agreement
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-[#159B42]" />
                  <h2 className="text-base font-bold text-[#243629]">
                    Invite a Supervisor &amp; Review Inspection Reports
                  </h2>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <select
                    value={supAgrId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSupAgrId(val);
                      setSupCategory(
                        val.startsWith('wagr_')
                          ? 'Sponsor & Worker Hiring Agreement'
                          : 'Sponsor & Farmer Support Agreement'
                      );
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
                      .filter((w) => w.status === 'Active Work')
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          Job: {w.jobTitle} ({w.workerName})
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
                    placeholder="Inspection frequency & evidence instructions"
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
                  Invite Supervisor
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

                {supervisionAssignments.length > 0 && (
                  <p className="mt-3 text-[11px] text-[#718071]">
                    Assigned Supervisors active: {supervisionAssignments.length}
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
              role="Sponsor"
              sponsorType={sponsorProfile.sponsorType}
              supportRequests={supportRequests}
              workerRequests={myPostedJobs}
            />
          )}
        </div>
      )}

      {primaryTab === 'Messages' && (
        <MessagingCenter
          currentUserId={user.id}
          currentUserRole="Sponsor"
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
            role="Sponsor"
            status={user.verificationStatus}
            notes={user.verificationNotes}
          />
          <form
            onSubmit={handleSaveProfile}
            className="space-y-5 rounded-3xl border border-emerald-900/15 bg-white p-6 sm:p-8"
          >
            <div className="border-b border-slate-100 pb-4">
              <h2 className="font-display text-xl font-bold text-[#243629]">
                {isOrg ? 'Organisation Sponsor Profile' : 'Individual Sponsor Profile'} (
                {sponsorProfile.verificationStatus})
              </h2>
              <p className="mt-1 text-xs text-[#718071]">
                Updating verified identity name or ID re-queues status to Pending Verification.
              </p>
            </div>
            {profileNotice && (
              <div className="rounded-xl border border-emerald-200 bg-[#EAF6EC] px-4 py-3 text-xs font-bold text-[#116B32]">
                {profileNotice}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {isOrg ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold">Organisation Name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Organisation Type</label>
                    <input
                      type="text"
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Office Address</label>
                    <input
                      type="text"
                      value={officeAddr}
                      onChange={(e) => setOfficeAddr(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Website</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Representative Name</label>
                    <input
                      type="text"
                      value={repName}
                      onChange={(e) => setRepName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Representative Position</label>
                    <input
                      type="text"
                      value={repPosition}
                      onChange={(e) => setRepPosition(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold">
                      Registration Documents
                    </label>
                    <input
                      type="text"
                      value={regDocs}
                      onChange={(e) => setRegDocs(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
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
                    <label className="block text-xs font-semibold">Social Media Links</label>
                    <input
                      type="text"
                      value={socialLinks}
                      onChange={(e) => setSocialLinks(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                </>
              )}

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
                <label className="block text-xs font-semibold">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Areas of Interest</label>
                <input
                  type="text"
                  value={interestsText}
                  onChange={(e) => setInterestsText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">ID Document Reference</label>
                <input
                  type="text"
                  value={govId}
                  onChange={(e) => setGovId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">
                  {isOrg ? 'Logo Reference' : 'Profile Picture Reference'}
                </label>
                <input
                  type="text"
                  value={profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold">Support Categories</label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {SUPPORT_CATEGORY_OPTIONS.map((c) => (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={supportCats.includes(c)}
                      onChange={() =>
                        setSupportCats(
                          supportCats.includes(c)
                            ? supportCats.filter((i) => i !== c)
                            : [...supportCats, c]
                        )
                      }
                      className="accent-[#159B42]"
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#159B42] px-6 py-3 text-xs font-bold text-white hover:bg-[#116B32]"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Save Sponsor Profile</span>
            </button>
          </form>
        </div>
      )}
    </RoleDashboardShell>
  );

  function setJobPayBasisIfNeeded(val: WorkerPaymentBasis) {
    setJobBasis(val);
  }
};

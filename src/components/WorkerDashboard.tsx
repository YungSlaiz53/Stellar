import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Search,
  Wallet,
} from 'lucide-react';
import {
  AcceptanceFeeRecord,
  Conversation,
  DirectMessage,
  FARM_WORK_CATEGORIES,
  PlatformNotification,
  PlatformUser,
  WorkerAgreement,
  WorkerApplication,
  WorkerPayment,
  WorkerProfile,
  WorkerRequest,
} from '../types/farmfund';
import { PrimaryRoleTab, RoleDashboardShell } from './RoleDashboardShell';
import { VerificationBanner } from './VerificationBanner';
import { MessageRecipientOption, MessagingCenter } from './MessagingCenter';
import { StellarWalletDashboard } from './StellarWalletDashboard';

interface WorkerDashboardProps {
  user: PlatformUser;
  workerProfile: WorkerProfile;
  workerRequests: WorkerRequest[];
  workerApplications: WorkerApplication[];
  workerAgreements: WorkerAgreement[];
  workerPayments: WorkerPayment[];
  acceptanceFees?: AcceptanceFeeRecord[];
  conversations: Conversation[];
  messages: DirectMessage[];
  notifications: PlatformNotification[];
  unreadCount: number;
  onApplyForJob: (params: {
    workerRequestId: string;
    proposedWageNaira: number;
    message: string;
  }) => Promise<void>;
  onWithdrawApplication: (applicationId: string) => Promise<void>;
  onConfirmWageReceipt: (paymentId: string) => Promise<void>;
  onLockAcceptanceFee?: (feeId: string) => Promise<void>;
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

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({
  user,
  workerProfile,
  workerRequests,
  workerApplications,
  workerAgreements,
  workerPayments,
  acceptanceFees = [],
  conversations,
  messages,
  notifications,
  unreadCount,
  onApplyForJob,
  onWithdrawApplication,
  onConfirmWageReceipt,
  onLockAcceptanceFee,
  onUpdateProfile,
  onSendMessage,
  onMarkConversationRead,
  onSignOut,
}) => {
  const [primaryTab, setPrimaryTab] = useState<PrimaryRoleTab>('Dashboard');
  const [subView, setSubView] = useState<
    'Available Jobs' | 'My Applications' | 'Accepted & History' | 'Wallet'
  >('Available Jobs');

  // Job search & filters
  const [locationQuery, setLocationQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [minWageFilter, setMinWageFilter] = useState('0');

  // Job detail & application composer
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [proposedWage, setProposedWage] = useState<string>('');
  const [applyMessage, setApplyMessage] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Editable Profile State
  const [fullName, setFullName] = useState(workerProfile.fullName);
  const [phone, setPhone] = useState(workerProfile.phone);
  const [country, setCountry] = useState(workerProfile.country);
  const [stateName, setStateName] = useState(workerProfile.state);
  const [lga, setLga] = useState(workerProfile.lga);
  const [residentialLocation, setResidentialLocation] = useState(workerProfile.residentialLocation);
  const [profilePicture, setProfilePicture] = useState(workerProfile.profilePicture);
  const [skillsText, setSkillsText] = useState(workerProfile.skills.join(', '));
  const [experience, setExperience] = useState(workerProfile.farmingExperience);
  const [workTypes, setWorkTypes] = useState<string[]>(workerProfile.availableWorkTypes || []);
  const [availability, setAvailability] = useState(workerProfile.availability);
  const [expectedWage, setExpectedWage] = useState(String(workerProfile.expectedWageNaira));
  const [wageUnit, setWageUnit] = useState(workerProfile.wageUnit);
  const [bio, setBio] = useState(workerProfile.bio);
  const [supportingDocs, setSupportingDocs] = useState(
    (workerProfile.supportingDocuments || []).join(', ')
  );
  const [governmentIdDoc, setGovernmentIdDoc] = useState(workerProfile.governmentIdDocument);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const filteredJobs = useMemo(
    () =>
      workerRequests.filter((job) => {
        const q = locationQuery.trim().toLowerCase();
        const matchLoc =
          !q ||
          job.location.toLowerCase().includes(q) ||
          job.jobTitle.toLowerCase().includes(q) ||
          job.farmerName.toLowerCase().includes(q);
        const matchCat =
          categoryFilter === 'All Categories' || job.workCategory === categoryFilter;
        const matchWage = job.paymentAmountNaira >= (Number(minWageFilter) || 0);
        return matchLoc && matchCat && matchWage;
      }),
    [workerRequests, locationQuery, categoryFilter, minWageFilter]
  );

  const availableRecipients = useMemo<MessageRecipientOption[]>(() => {
    const map = new Map<string, MessageRecipientOption>();
    for (const job of workerRequests) {
      map.set(job.hirerId, {
        id: job.hirerId,
        name: job.hirerName,
        role: job.hirerRole,
        contextTitle: job.jobTitle,
        contextType: 'Job',
      });
    }
    for (const agr of workerAgreements) {
      map.set(agr.hirerId, {
        id: agr.hirerId,
        name: agr.hirerName,
        role: agr.hirerRole,
        contextTitle: agr.jobTitle,
        contextType: 'Job',
      });
      if (agr.assignedSupervisorId && agr.assignedSupervisorName) {
        map.set(agr.assignedSupervisorId, {
          id: agr.assignedSupervisorId,
          name: agr.assignedSupervisorName,
          role: 'Supervisor',
          contextTitle: `Supervision: ${agr.jobTitle}`,
          contextType: 'Supervision',
        });
      }
    }
    for (const m of messages) {
      const otherId = m.senderId === user.id ? m.recipientId : m.senderId;
      const otherName = m.senderId === user.id ? m.recipientName : m.senderName;
      if (!map.has(otherId)) {
        map.set(otherId, {
          id: otherId,
          name: otherName,
          role: m.senderId === user.id ? 'Farmer' : m.senderRole,
          contextTitle: m.contextTitle,
          contextType: 'General',
        });
      }
    }
    return Array.from(map.values());
  }, [workerRequests, workerAgreements, messages, user.id]);

  const handleApplySubmit = async (job: WorkerRequest) => {
    setActionMsg(null);
    setBusy(true);
    try {
      await onApplyForJob({
        workerRequestId: job.id,
        proposedWageNaira: Number(proposedWage) || job.paymentAmountNaira,
        message: applyMessage.trim() || 'Available to start on the scheduled date.',
      });
      setSelectedJobId(null);
      setApplyMessage('');
      setActionMsg({
        type: 'ok',
        text: `Application submitted for "${job.jobTitle}". Track it under My Applications.`,
      });
    } catch (err: unknown) {
      setActionMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to apply for this job.',
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
        townOrLocation: residentialLocation.trim(),
        residentialLocation: residentialLocation.trim(),
        location: `${residentialLocation.trim()}, ${stateName.trim()}`,
        profilePicture: profilePicture.trim(),
        governmentIdDocument: governmentIdDoc.trim(),
        skills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        farmingExperience: experience.trim(),
        availableWorkTypes: workTypes,
        availability: availability.trim(),
        expectedWageNaira: Number(expectedWage) || 5000,
        wageUnit,
        bio: bio.trim(),
        supportingDocuments: supportingDocs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setProfileNotice(
        res.reverificationTriggered
          ? 'Worker profile updated. Identity field updates re-queued your status to Pending Verification.'
          : 'Worker profile changes saved.'
      );
    } catch (err: unknown) {
      setProfileNotice(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoleDashboardShell
      role="Worker"
      displayName={user.fullName}
      activeTab={primaryTab}
      onSelectTab={setPrimaryTab}
      unreadCount={unreadCount}
      onSignOut={onSignOut}
    >
      {primaryTab === 'Dashboard' && (
        <div className="space-y-6">
          <VerificationBanner
            role="Worker"
            status={user.verificationStatus}
            notes={user.verificationNotes}
            onOpenProfile={() => setPrimaryTab('Profile')}
          />

          {/* Worker Welcome Header + Real Metrics */}
          <div className="rounded-3xl border border-emerald-900/15 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#159B42]">
                  Worker Workspace
                </span>
                <h1 className="mt-1 font-display text-2xl font-bold text-[#243629]">
                  Welcome, {user.fullName}
                </h1>
                <p className="mt-1 text-xs text-[#718071]">
                  Discover farm work published by verified hirers, track your applications, and
                  receive 100% of your agreed wages directly.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 rounded-2xl bg-[#F5F8F3] px-5 py-3 text-right">
                <div>
                  <p className="text-[11px] text-[#718071]">Open Jobs</p>
                  <p className="font-mono text-lg font-bold text-[#243629] tabular-nums">
                    {workerRequests.length}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718071]">Applications</p>
                  <p className="font-mono text-lg font-bold text-[#116B32] tabular-nums">
                    {workerApplications.length}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718071]">Accepted Jobs</p>
                  <p className="font-mono text-lg font-bold text-[#159B42] tabular-nums">
                    {workerAgreements.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-Navigation inside Worker Dashboard */}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {(
                [
                  'Available Jobs',
                  'My Applications',
                  'Accepted & History',
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

          {actionMsg && (
            <div
              role={actionMsg.type === 'err' ? 'alert' : 'status'}
              className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
                actionMsg.type === 'err'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-emerald-200 bg-[#EAF6EC] text-[#116B32]'
              }`}
            >
              {actionMsg.text}
            </div>
          )}

          {acceptanceFees.some((f) => f.status === 'Pending Deposit' && f.obligorId === user.id) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              <div>
                <p className="font-bold">
                  Action Required: Lock Your Anti-Absconding Acceptance Fee (USDC)
                </p>
                <p className="mt-0.5 text-amber-900">
                  Lock your refundable 5% commitment bond before starting hired farm work. 100%
                  refunded upon verified work completion; forfeited only if you abscond / no-show.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubView('Accepted & History')}
                className="rounded-xl bg-amber-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-800"
              >
                Review Acceptance Fee
              </button>
            </div>
          )}

          {subView === 'Available Jobs' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#718071]" />
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="Search by location, crop, or hirer..."
                    className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-xs"
                  />
                </div>
                <select
                  aria-label="Filter by work category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="All Categories">All 13 Farm Work Categories</option>
                  {FARM_WORK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={minWageFilter}
                  onChange={(e) => setMinWageFilter(e.target.value)}
                  placeholder="Min wage (₦)"
                  className="rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>

              {filteredJobs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-emerald-900/20 bg-white p-10 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-[#159B42]" />
                  <h2 className="mt-3 text-base font-bold text-[#243629]">
                    No farm jobs published right now
                  </h2>
                  <p className="mx-auto mt-1 max-w-md text-xs text-[#718071]">
                    Farm jobs posted by verified Farmers or Sponsors appear here automatically.
                    Keep your profile skills and availability up to date while waiting for new
                    opportunities.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredJobs.map((job) => {
                    const alreadyApplied = workerApplications.some(
                      (a) => a.workerRequestId === job.id && a.status !== 'Withdrawn'
                    );
                    const isExpanding = selectedJobId === job.id;
                    return (
                      <div
                        key={job.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-mono font-bold text-[#159B42]">
                              {job.workCategory}
                            </span>
                            <span className="font-mono text-[#718071]">{job.status}</span>
                          </div>
                          <h3 className="mt-1.5 text-base font-bold text-[#243629]">
                            {job.jobTitle}
                          </h3>
                          <p className="mt-1 flex items-center gap-1 text-xs text-[#718071]">
                            <MapPin className="h-3.5 w-3.5 text-[#159B42]" />
                            <span>
                              {job.location} · Posted by {job.hirerName} ({job.hirerRole})
                            </span>
                          </p>
                          <p className="mt-2.5 text-xs leading-relaxed text-[#243629]">
                            {job.description}
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#F5F8F3] p-3 text-[11px]">
                            <div>
                              <span className="text-[#718071]">Wage:</span>{' '}
                              <strong className="font-mono text-[#116B32]">
                                ₦{job.paymentAmountNaira.toLocaleString('en-NG')}
                              </strong>{' '}
                              ({job.paymentBasis})
                            </div>
                            <div>
                              <span className="text-[#718071]">Slots:</span>{' '}
                              <strong className="font-mono">
                                {job.workersHired}/{job.workersNeeded}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[#718071]">Start:</span> {job.startDate}
                            </div>
                            <div>
                              <span className="text-[#718071]">Duration:</span>{' '}
                              {job.expectedDuration}
                            </div>
                            <div className="col-span-2">
                              <span className="text-[#718071]">Required Skills:</span>{' '}
                              {job.requiredSkills}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-slate-100 pt-3">
                          {alreadyApplied ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116B32]">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Application Submitted</span>
                            </span>
                          ) : !isExpanding ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedJobId(job.id);
                                setProposedWage(String(job.paymentAmountNaira));
                              }}
                              className="w-full rounded-xl bg-[#159B42] py-2.5 text-xs font-bold text-white hover:bg-[#116B32]"
                            >
                              Apply for This Job
                            </button>
                          ) : (
                            <div className="space-y-2.5 rounded-xl bg-[#EAF6EC] p-3.5">
                              <div>
                                <label className="block text-[11px] font-bold text-[#243629]">
                                  Proposed Wage (₦) — 0% Sponsor Share Deducted
                                </label>
                                <input
                                  type="number"
                                  value={proposedWage}
                                  onChange={(e) => setProposedWage(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-[#243629]">
                                  Application Message
                                </label>
                                <textarea
                                  rows={2}
                                  value={applyMessage}
                                  onChange={(e) => setApplyMessage(e.target.value)}
                                  placeholder="Explain your relevant farm work experience & availability..."
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleApplySubmit(job)}
                                  className="flex-1 rounded-lg bg-[#159B42] py-2 text-xs font-bold text-white hover:bg-[#116B32]"
                                >
                                  Submit Application
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedJobId(null)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#243629]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {subView === 'My Applications' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-bold text-[#243629]">
                My Job Applications ({workerApplications.length})
              </h2>
              {workerApplications.length === 0 ? (
                <p className="mt-4 text-xs text-[#718071]">
                  You have not applied to any farm jobs yet. Browse Available Jobs to submit your
                  first application.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {workerApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 text-xs"
                    >
                      <div>
                        <p className="font-bold text-[#243629]">{app.jobTitle}</p>
                        <p className="mt-0.5 text-[#718071]">
                          {app.hirerName} ({app.hirerRole}) · {app.location} · Proposed ₦
                          {app.proposedWageNaira.toLocaleString('en-NG')}
                        </p>
                        <p className="mt-1 italic text-[#718071]">&ldquo;{app.message}&rdquo;</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-[#EAF6EC] px-2.5 py-1 font-mono font-bold text-[#116B32]">
                          {app.status}
                        </span>
                        {app.status === 'Applied' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onWithdrawApplication(app.id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 font-bold text-red-800 hover:bg-red-100"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {subView === 'Accepted & History' && (
            <div className="space-y-4">
              {/* Worker Acceptance Fee Commitment Bonds */}
              {acceptanceFees.length > 0 && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-6">
                  <h2 className="text-base font-bold text-[#243629]">
                    Worker Acceptance Fees — Anti-Absconding Protection ({acceptanceFees.length})
                  </h2>
                  <p className="mt-1 text-xs text-amber-950">
                    Refunded 100% back to your wallet upon verified work completion. Forfeited to
                    the Hirer only if a worker absconds / goes into hiding without completing agreed
                    duties.
                  </p>
                  <div className="mt-4 space-y-3">
                    {acceptanceFees.map((fee) => (
                      <div
                        key={fee.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-4 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#243629]">
                            {fee.agreementTitle} · Hirer: {fee.beneficiaryName}
                          </p>
                          <p className="mt-0.5 font-mono font-bold text-[#116B32]">
                            Acceptance Fee: {fee.feeAmountUsdc.toFixed(2)} USDC (₦
                            {fee.feeAmountNaira.toLocaleString('en-NG')})
                          </p>
                          {fee.abscondedReason && (
                            <p className="mt-1 text-red-800">Resolution Note: {fee.abscondedReason}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#EAF6EC] px-2.5 py-1 font-mono font-bold text-[#116B32]">
                            {fee.status}
                          </span>
                          {fee.status === 'Pending Deposit' &&
                            fee.obligorId === user.id &&
                            onLockAcceptanceFee && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                  setBusy(true);
                                  setActionMsg(null);
                                  try {
                                    await onLockAcceptanceFee(fee.id);
                                    setActionMsg({
                                      type: 'ok',
                                      text: `Acceptance Fee (${fee.feeAmountUsdc.toFixed(2)} USDC) locked in escrow. It will be 100% refunded upon work completion.`,
                                    });
                                  } catch (err: unknown) {
                                    setActionMsg({
                                      type: 'err',
                                      text:
                                        err instanceof Error
                                          ? err.message
                                          : 'Failed to lock acceptance fee.',
                                    });
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                                className="rounded-lg bg-[#159B42] px-3.5 py-1.5 font-bold text-white hover:bg-[#116B32]"
                              >
                                Lock Acceptance Fee ({fee.feeAmountUsdc.toFixed(2)} USDC)
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#159B42]" />
                  <h2 className="text-base font-bold text-[#243629]">
                    Accepted Jobs &amp; Wage Settlements ({workerAgreements.length})
                  </h2>
                </div>
                {workerAgreements.length === 0 ? (
                  <p className="mt-3 text-xs text-[#718071]">
                    Once a Farmer or Sponsor accepts your application, your active work agreement
                    and payment tracking appear here.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {workerAgreements.map((agr) => {
                      const payment = workerPayments.find((p) => p.workerAgreementId === agr.id);
                      return (
                        <div
                          key={agr.id}
                          className="rounded-xl border border-slate-200 bg-[#F5F8F3] p-4 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-bold text-[#243629]">
                              {agr.jobTitle}
                            </span>
                            <span className="font-mono font-bold text-[#116B32]">{agr.status}</span>
                          </div>
                          <p className="mt-1 text-[#718071]">
                            Hirer: {agr.hirerName} ({agr.hirerRole}) · Agreed Wage:{' '}
                            <strong className="font-mono text-[#243629]">
                              ₦{agr.agreedWageNaira.toLocaleString('en-NG')}
                            </strong>{' '}
                            (0% Sponsor Share)
                          </p>
                          {payment && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5">
                              <span>
                                Payment Status:{' '}
                                <strong className="text-[#116B32]">{payment.status}</strong>
                              </span>
                              {payment.status === 'Awaiting Payment Confirmation' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void onConfirmWageReceipt(payment.id)}
                                  className="rounded-lg bg-[#159B42] px-3.5 py-1.5 font-bold text-white hover:bg-[#116B32]"
                                >
                                  Confirm Full Wage Received
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {subView === 'Wallet' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#116B32]">
                <Wallet className="h-4 w-4" />
                <span>Embedded Worker Wage Wallet (Receive &amp; Send Stellar USDC Directly)</span>
              </div>
              <StellarWalletDashboard
                userId={user.id}
                userName={user.fullName}
                role="Worker"
                supportRequests={[]}
                workerRequests={workerRequests}
                acceptanceFees={acceptanceFees}
                onLockAcceptanceFee={onLockAcceptanceFee}
              />
            </div>
          )}
        </div>
      )}

      {primaryTab === 'Messages' && (
        <MessagingCenter
          currentUserId={user.id}
          currentUserRole="Worker"
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
            role="Worker"
            status={user.verificationStatus}
            notes={user.verificationNotes}
          />
          <form
            onSubmit={handleSaveProfile}
            className="space-y-5 rounded-3xl border border-emerald-900/15 bg-white p-6 sm:p-8"
          >
            <div className="border-b border-slate-100 pb-4">
              <h2 className="font-display text-xl font-bold text-[#243629]">
                Worker Profile ({workerProfile.verificationStatus})
              </h2>
              <p className="mt-1 text-xs text-[#718071]">
                Updating legal name or government ID re-triggers Pending Verification for safety.
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
                <label className="block text-xs font-semibold">Local Government Area</label>
                <input
                  type="text"
                  value={lga}
                  onChange={(e) => setLga(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Residential Location</label>
                <input
                  type="text"
                  value={residentialLocation}
                  onChange={(e) => setResidentialLocation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Experience</label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Expected Wage (₦)</label>
                <input
                  type="number"
                  value={expectedWage}
                  onChange={(e) => setExpectedWage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Wage Unit</label>
                <input
                  type="text"
                  value={wageUnit}
                  onChange={(e) => setWageUnit(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Availability</label>
                <input
                  type="text"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Government ID Document</label>
                <input
                  type="text"
                  value={governmentIdDoc}
                  onChange={(e) => setGovernmentIdDoc(e.target.value)}
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
              <label className="block text-xs font-semibold">Work Categories</label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {FARM_WORK_CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={workTypes.includes(cat)}
                      onChange={() =>
                        setWorkTypes(
                          workTypes.includes(cat)
                            ? workTypes.filter((w) => w !== cat)
                            : [...workTypes, cat]
                        )
                      }
                      className="accent-[#159B42]"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold">Bio / Description</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="rounded-2xl bg-[#159B42] px-6 py-3 text-xs font-bold text-white hover:bg-[#116B32]"
            >
              Save Worker Profile Changes
            </button>
          </form>
        </div>
      )}
    </RoleDashboardShell>
  );
};

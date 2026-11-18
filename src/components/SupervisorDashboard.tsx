import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import {
  Conversation,
  DirectMessage,
  PlatformNotification,
  PlatformUser,
  SUPERVISOR_SPECIALISATIONS,
  SupervisionAssignment,
  SupervisionReport,
  SupervisionRequest,
  SupervisorProfile,
  WorkerPayment,
} from '../types/farmfund';
import { PrimaryRoleTab, RoleDashboardShell } from './RoleDashboardShell';
import { VerificationBanner } from './VerificationBanner';
import { MessageRecipientOption, MessagingCenter } from './MessagingCenter';
import { StellarWalletDashboard } from './StellarWalletDashboard';

interface SupervisorDashboardProps {
  user: PlatformUser;
  supervisorProfile: SupervisorProfile;
  supervisionRequests: SupervisionRequest[];
  supervisionAssignments: SupervisionAssignment[];
  supervisionReports: SupervisionReport[];
  workerPayments: WorkerPayment[];
  conversations: Conversation[];
  messages: DirectMessage[];
  notifications: PlatformNotification[];
  unreadCount: number;
  onRespondToInvitation: (
    requestId: string,
    decision: 'ACCEPT' | 'DECLINE',
    note?: string
  ) => Promise<void>;
  onSubmitReport: (params: {
    assignmentId: string;
    reportType: SupervisionReport['reportType'];
    summary: string;
    observations: string;
    recommendCompletion: boolean;
    evidenceUrls: string[];
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

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  user,
  supervisorProfile,
  supervisionRequests,
  supervisionAssignments,
  supervisionReports,
  workerPayments,
  conversations,
  messages,
  notifications,
  unreadCount,
  onRespondToInvitation,
  onSubmitReport,
  onUpdateProfile,
  onSendMessage,
  onMarkConversationRead,
  onSignOut,
}) => {
  const [primaryTab, setPrimaryTab] = useState<PrimaryRoleTab>('Dashboard');
  const [subView, setSubView] = useState<
    'Assigned Projects' | 'Submit Inspection Report' | 'Payment & Wallet Status'
  >('Assigned Projects');

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    supervisionAssignments[0]?.id || ''
  );
  const [reportType, setReportType] =
    useState<SupervisionReport['reportType']>('Progress Inspection');
  const [reportSummary, setReportSummary] = useState('');
  const [reportObservations, setReportObservations] = useState('');
  const [recommendCompletion, setRecommendCompletion] = useState(false);
  const [evidenceInput, setEvidenceInput] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Editable Profile State
  const [fullName, setFullName] = useState(supervisorProfile.fullName);
  const [phone, setPhone] = useState(supervisorProfile.phone);
  const [country, setCountry] = useState(supervisorProfile.country);
  const [stateName, setStateName] = useState(supervisorProfile.state);
  const [lga, setLga] = useState(supervisorProfile.lga);
  const [residentialLocation, setResidentialLocation] = useState(
    supervisorProfile.residentialLocation
  );
  const [qualifications, setQualifications] = useState(
    supervisorProfile.professionalQualifications
  );
  const [experience, setExperience] = useState(supervisorProfile.agriculturalExperience);
  const [specialisations, setSpecialisations] = useState<string[]>(
    supervisorProfile.specialisations || []
  );
  const [certificationsText, setCertificationsText] = useState(
    (supervisorProfile.certifications || []).join(', ')
  );
  const [bio, setBio] = useState(supervisorProfile.bio);
  const [availabilityLocs, setAvailabilityLocs] = useState(
    supervisorProfile.availabilityAndServiceLocations
  );
  const [govId, setGovId] = useState(supervisorProfile.governmentIdDocument);
  const [profilePicture, setProfilePicture] = useState(supervisorProfile.profilePicture);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  // Strictly scoped recipients: ONLY authorised participants on invited/assigned projects
  const availableRecipients = useMemo<MessageRecipientOption[]>(() => {
    const map = new Map<string, MessageRecipientOption>();
    for (const a of supervisionAssignments) {
      if (a.farmerId && a.farmerName) {
        map.set(a.farmerId, {
          id: a.farmerId,
          name: a.farmerName,
          role: 'Farmer',
          contextTitle: a.projectTitle,
          contextType: 'Supervision',
        });
      }
      if (a.sponsorId && a.sponsorName) {
        map.set(a.sponsorId, {
          id: a.sponsorId,
          name: a.sponsorName,
          role: 'Sponsor',
          contextTitle: a.projectTitle,
          contextType: 'Supervision',
        });
      }
      if (a.workerId && a.workerName) {
        map.set(a.workerId, {
          id: a.workerId,
          name: a.workerName,
          role: 'Worker',
          contextTitle: a.projectTitle,
          contextType: 'Supervision',
        });
      }
    }
    for (const r of supervisionRequests) {
      if (!map.has(r.requestedById)) {
        map.set(r.requestedById, {
          id: r.requestedById,
          name: r.requestedByName,
          role: r.requestedByRole,
          contextTitle: r.projectTitle,
          contextType: 'Supervision',
        });
      }
    }
    return Array.from(map.values());
  }, [supervisionAssignments, supervisionRequests]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMsg(null);
    const targetId = selectedAssignmentId || supervisionAssignments[0]?.id;
    if (!targetId) {
      setActionMsg({
        type: 'err',
        text: 'Accept a supervision assignment before submitting an inspection report.',
      });
      return;
    }
    if (!reportSummary.trim() || !reportObservations.trim()) {
      setActionMsg({ type: 'err', text: 'Enter report summary and field observations.' });
      return;
    }
    setBusy(true);
    try {
      await onSubmitReport({
        assignmentId: targetId,
        reportType,
        summary: reportSummary.trim(),
        observations: reportObservations.trim(),
        recommendCompletion,
        evidenceUrls: evidenceInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setReportSummary('');
      setReportObservations('');
      setEvidenceInput('');
      setRecommendCompletion(false);
      setActionMsg({
        type: 'ok',
        text: 'Inspection report recorded and shared with authorised project parties. Remember: supervisor reports are evidence only and do not auto-release funds.',
      });
    } catch (err: unknown) {
      setActionMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to submit report.',
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
        profilePicture: profilePicture.trim(),
        governmentIdDocument: govId.trim(),
        professionalQualifications: qualifications.trim(),
        agriculturalExperience: experience.trim(),
        specialisations,
        certifications: certificationsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        bio: bio.trim(),
        availabilityAndServiceLocations: availabilityLocs.trim(),
      });
      setProfileNotice(
        res.reverificationTriggered
          ? 'Supervisor profile updated. Identity document updates re-triggered Pending Verification.'
          : 'Supervisor profile saved.'
      );
    } catch (err: unknown) {
      setProfileNotice(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoleDashboardShell
      role="Supervisor"
      displayName={user.fullName}
      activeTab={primaryTab}
      onSelectTab={setPrimaryTab}
      unreadCount={unreadCount}
      onSignOut={onSignOut}
    >
      {primaryTab === 'Dashboard' && (
        <div className="space-y-6">
          <VerificationBanner
            role="Supervisor"
            status={user.verificationStatus}
            notes={user.verificationNotes}
            onOpenProfile={() => setPrimaryTab('Profile')}
          />

          <div className="rounded-3xl border border-emerald-900/15 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#159B42]">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Independent Project Supervision Desk</span>
                </div>
                <h1 className="mt-1 font-display text-2xl font-bold text-[#243629]">
                  Welcome, {user.fullName}
                </h1>
                <p className="mt-1 max-w-2xl text-xs text-[#718071]">
                  You only view accepted agreements where supervision is requested and you are
                  invited or assigned. Supervisors submit inspection evidence and cannot alter
                  agreements or transfer funds from user wallets.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 rounded-2xl bg-[#F5F8F3] px-5 py-3 text-right">
                <div>
                  <p className="text-[11px] text-[#718071]">Invitations</p>
                  <p className="font-mono text-lg font-bold text-[#243629] tabular-nums">
                    {supervisionRequests.filter((r) => r.status === 'Invited').length}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718071]">Active Projects</p>
                  <p className="font-mono text-lg font-bold text-[#116B32] tabular-nums">
                    {supervisionAssignments.length}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#718071]">Reports Filed</p>
                  <p className="font-mono text-lg font-bold text-[#159B42] tabular-nums">
                    {supervisionReports.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {(
                [
                  'Assigned Projects',
                  'Submit Inspection Report',
                  'Payment & Wallet Status',
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

          {subView === 'Assigned Projects' && (
            <div className="space-y-6">
              {/* Pending Invitations */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-base font-bold text-[#243629]">
                  Supervision Invitations ({supervisionRequests.length})
                </h2>
                {supervisionRequests.length === 0 ? (
                  <p className="mt-3 text-xs text-[#718071]">
                    No supervision invitations yet. Private agreements remain hidden unless both
                    parties accept, request supervision, and invite you.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {supervisionRequests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-slate-200 bg-[#F5F8F3] p-4 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono font-bold text-[#159B42]">
                            {req.agreementCategory}
                          </span>
                          <span className="font-mono font-bold text-[#243629]">{req.status}</span>
                        </div>
                        <h3 className="mt-1 text-sm font-bold text-[#243629]">
                          {req.projectTitle}
                        </h3>
                        <p className="mt-1 text-[#718071]">
                          Location: {req.location} · Invited by {req.requestedByName} (
                          {req.requestedByRole})
                        </p>
                        <p className="mt-1 text-[#243629]">
                          Agreed Work: {req.agreedWorkSummary} · Schedule: {req.expectedStartDate} →{' '}
                          {req.expectedCompletionDate}
                        </p>
                        <p className="mt-1 text-[#718071]">
                          Instructions: {req.supervisionInstructions}
                        </p>
                        {req.status === 'Invited' && (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onRespondToInvitation(req.id, 'ACCEPT')}
                              className="rounded-xl bg-[#159B42] px-4 py-2 font-bold text-white hover:bg-[#116B32]"
                            >
                              Accept Supervision Assignment
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onRespondToInvitation(req.id, 'DECLINE')}
                              className="rounded-xl border border-red-200 bg-white px-4 py-2 font-bold text-red-700 hover:bg-red-50"
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

              {/* Assigned Projects */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-base font-bold text-[#243629]">
                  Active Supervised Projects ({supervisionAssignments.length})
                </h2>
                {supervisionAssignments.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                    <ClipboardCheck className="mx-auto h-7 w-7 text-[#159B42]" />
                    <p className="mt-2 text-sm font-bold text-[#243629]">
                      No assigned supervision projects yet
                    </p>
                    <p className="mt-1 text-xs text-[#718071]">
                      Accept a supervision invitation above to view project details and log
                      inspection reports.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {supervisionAssignments.map((a) => {
                      const projectReports = supervisionReports.filter(
                        (r) => r.assignmentId === a.id
                      );
                      return (
                        <div
                          key={a.id}
                          className="rounded-2xl border border-slate-200 p-5 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono font-bold text-[#116B32]">
                              {a.agreementCategory}
                            </span>
                            <span className="rounded-md bg-[#EAF6EC] px-2.5 py-0.5 font-mono font-bold text-[#116B32]">
                              {a.status}
                            </span>
                          </div>
                          <h3 className="mt-1 text-base font-bold text-[#243629]">
                            {a.projectTitle}
                          </h3>
                          <p className="mt-1 text-[#718071]">
                            Location: {a.location} · Start: {a.expectedStartDate} · Target End:{' '}
                            {a.expectedCompletionDate}
                          </p>
                          <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-[#F5F8F3] p-3 sm:grid-cols-3">
                            <div>
                              <span className="text-[#718071]">Farmer:</span>{' '}
                              <strong>{a.farmerName || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-[#718071]">Sponsor:</span>{' '}
                              <strong>{a.sponsorName || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-[#718071]">Worker:</span>{' '}
                              <strong>{a.workerName || 'N/A'}</strong>
                            </div>
                            <div className="sm:col-span-3">
                              <span className="text-[#718071]">Requirements:</span>{' '}
                              {a.supervisionRequirements}
                            </div>
                          </div>

                          {projectReports.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="font-bold text-[#243629]">
                                Filed Inspection Reports ({projectReports.length})
                              </p>
                              {projectReports.map((rep) => (
                                <div
                                  key={rep.id}
                                  className="rounded-xl border border-slate-200 bg-white p-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-[#116B32]">
                                      {rep.reportType}
                                    </span>
                                    <span className="font-mono text-[10px] text-[#718071]">
                                      {rep.createdAt.slice(0, 10)}
                                    </span>
                                  </div>
                                  <p className="mt-1 font-semibold text-[#243629]">{rep.summary}</p>
                                  <p className="mt-0.5 text-[#718071]">{rep.observations}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {subView === 'Submit Inspection Report' && (
            <form
              onSubmit={handleReportSubmit}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="h-4 w-4 text-[#159B42]" />
                <h2 className="text-base font-bold text-[#243629]">
                  Submit Project Progress / Inspection Report
                </h2>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 text-amber-700" />
                Inspection reports and completion recommendations serve strictly as verified field
                evidence for the agreement parties. They never secretly alter agreement terms or
                release escrow funds autonomously.
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold">Assigned Project</label>
                  <select
                    value={selectedAssignmentId || supervisionAssignments[0]?.id || ''}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    disabled={supervisionAssignments.length === 0}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    {supervisionAssignments.length === 0 ? (
                      <option value="">No assigned projects</option>
                    ) : (
                      supervisionAssignments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.projectTitle} ({a.location})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold">Report Category</label>
                  <select
                    value={reportType}
                    onChange={(e) =>
                      setReportType(e.target.value as SupervisionReport['reportType'])
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="Progress Inspection">Progress Inspection</option>
                    <option value="Delay or Issue Report">Delay or Issue Report</option>
                    <option value="Suspected Resource Misuse Alert">
                      Suspected Resource Misuse Alert
                    </option>
                    <option value="Completion Observation & Recommendation">
                      Completion Observation &amp; Recommendation
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold">Report Headline / Summary *</label>
                <input
                  type="text"
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                  placeholder="e.g. Week 4 planting inspection verified on-site"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold">
                  Detailed Inspection Observations *
                </label>
                <textarea
                  rows={4}
                  value={reportObservations}
                  onChange={(e) => setReportObservations(e.target.value)}
                  placeholder="Document work quality, input utilisation, weather delays, or completion metrics..."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold">
                  Progress Photo / Evidence References (comma-separated)
                </label>
                <input
                  type="text"
                  value={evidenceInput}
                  onChange={(e) => setEvidenceInput(e.target.value)}
                  placeholder="e.g. field_inspection_01.jpg, weighbridge_slip.pdf"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-emerald-900/15 bg-[#EAF6EC] p-3 text-xs font-semibold text-[#116B32]">
                <input
                  type="checkbox"
                  checked={recommendCompletion}
                  onChange={(e) => setRecommendCompletion(e.target.checked)}
                  className="accent-[#159B42]"
                />
                <span>
                  Recommend that this project be marked completed (evidence for party approval
                  only)
                </span>
              </label>

              <button
                type="submit"
                disabled={busy || supervisionAssignments.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#159B42] px-6 py-3 text-xs font-bold text-white hover:bg-[#116B32] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Submit Inspection Report</span>
              </button>
            </form>
          )}

          {subView === 'Payment & Wallet Status' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#159B42]" />
                  <h2 className="text-base font-bold text-[#243629]">
                    Read-Only Authorised Project Payment Status ({workerPayments.length})
                  </h2>
                </div>
                {workerPayments.length === 0 ? (
                  <p className="mt-2 text-xs text-[#718071]">
                    No authorised worker wage records linked to your supervised projects yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2 text-xs">
                    {workerPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between rounded-xl border border-slate-200 p-3"
                      >
                        <span>
                          <strong>{p.jobTitle}</strong> ({p.workerName}) — ₦
                          {p.amountNaira.toLocaleString('en-NG')}
                        </span>
                        <span className="font-mono font-bold text-[#116B32]">{p.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <StellarWalletDashboard
                userId={user.id}
                userName={user.fullName}
                role="Supervisor"
                supportRequests={[]}
                workerRequests={[]}
              />
            </div>
          )}
        </div>
      )}

      {primaryTab === 'Messages' && (
        <MessagingCenter
          currentUserId={user.id}
          currentUserRole="Supervisor"
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
            role="Supervisor"
            status={user.verificationStatus}
            notes={user.verificationNotes}
          />
          <form
            onSubmit={handleSaveProfile}
            className="space-y-5 rounded-3xl border border-emerald-900/15 bg-white p-6 sm:p-8"
          >
            <div className="border-b border-slate-100 pb-4">
              <h2 className="font-display text-xl font-bold text-[#243629]">
                Supervisor Profile ({supervisorProfile.verificationStatus})
              </h2>
              <p className="mt-1 text-xs text-[#718071]">
                Updating your legal name or government ID resets verification status to Pending
                Verification for independent review.
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
                <label className="block text-xs font-semibold">Professional Qualifications</label>
                <input
                  type="text"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Agricultural Experience</label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Certifications</label>
                <input
                  type="text"
                  value={certificationsText}
                  onChange={(e) => setCertificationsText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">
                  Availability &amp; Service Locations
                </label>
                <input
                  type="text"
                  value={availabilityLocs}
                  onChange={(e) => setAvailabilityLocs(e.target.value)}
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
            </div>

            <div>
              <label className="block text-xs font-semibold">Specialisations</label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SUPERVISOR_SPECIALISATIONS.map((spec) => (
                  <label
                    key={spec}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={specialisations.includes(spec)}
                      onChange={() =>
                        setSpecialisations(
                          specialisations.includes(spec)
                            ? specialisations.filter((s) => s !== spec)
                            : [...specialisations, spec]
                        )
                      }
                      className="accent-[#159B42]"
                    />
                    <span>{spec}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold">Professional Description</label>
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
              Save Supervisor Profile
            </button>
          </form>
        </div>
      )}
    </RoleDashboardShell>
  );
};

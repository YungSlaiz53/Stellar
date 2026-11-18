import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AdminAuditLog,
  AssistanceType,
  Conversation,
  DirectMessage,
  DisputeRecord,
  FarmerProfile,
  OrganisationProfile,
  PlatformNotification,
  PlatformUser,
  ProfileVerificationStatus,
  PublicUserRole,
  ShareArrangementType,
  SponsorFundingAgreement,
  SponsorOffer,
  SponsorProfile,
  SupervisionAssignment,
  SupervisionReport,
  SupervisionRequest,
  SupervisorProfile,
  SupportRequest,
  VerificationApplication,
  WorkerAgreement,
  WorkerApplication,
  WorkerPayment,
  WorkerProfile,
  WorkerRequest,
} from './types/farmfund';
import { logOutUser, signInWithGoogle } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicHomePage } from './components/PublicHomePage';
import { RoleRegistrationFlow } from './components/RoleRegistrationFlow';
import { LoginModal } from './components/LoginModal';
import { WorkerDashboard } from './components/WorkerDashboard';
import { FarmerDashboard } from './components/FarmerDashboard';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { SponsorDashboard } from './components/SponsorDashboard';
import { AdminDashboard, type AdminTab } from './components/AdminDashboard';
import { SponsorAgreementModal } from './components/SponsorAgreementModal';

const SESSION_STORAGE_KEY = 'farmfund_session_user_id';

interface PlatformSnapshot {
  user: PlatformUser | null;
  users: PlatformUser[];
  workerProfiles: WorkerProfile[];
  farmerProfiles: FarmerProfile[];
  supervisorProfiles: SupervisorProfile[];
  sponsorProfiles: SponsorProfile[];
  organisations: OrganisationProfile[];
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
  disputes: DisputeRecord[];
  adminAuditLogs: AdminAuditLog[];
}

type PublicView =
  | { kind: 'home' }
  | { kind: 'register'; role: PublicUserRole }
  | { kind: 'signin'; mode: 'public' | 'admin' };

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export default function App() {
  const [publicView, setPublicView] = useState<PublicView>({ kind: 'home' });
  const [currentUser, setCurrentUser] = useState<PlatformUser | null>(null);
  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null);
  const [restoringSession, setRestoringSession] = useState<boolean>(true);
  const [adminTab, setAdminTab] = useState<AdminTab>('Verification & Users');
  const [activeAgreementModal, setActiveAgreementModal] =
    useState<SponsorFundingAgreement | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const applyAuthPayload = useCallback(
    (user: PlatformUser, rawSnapshot: Record<string, unknown>) => {
      localStorage.setItem(SESSION_STORAGE_KEY, user.id);
      setCurrentUser(user);
      setSnapshot(rawSnapshot as unknown as PlatformSnapshot);
      setGlobalError(null);
    },
    []
  );

  // Restore session on reload from /api/platform/state
  useEffect(() => {
    let active = true;
    const savedId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!savedId) {
      setRestoringSession(false);
      return;
    }

    fetch(`/api/platform/state?userId=${encodeURIComponent(savedId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: PlatformUser; snapshot?: Record<string, unknown> } | null) => {
        if (!active) return;
        if (data?.user && data?.snapshot) {
          setCurrentUser(data.user);
          setSnapshot(data.snapshot as unknown as PlatformSnapshot);
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      })
      .catch(() => {
        // Keep user on homepage cleanly if offline
      })
      .finally(() => {
        if (active) setRestoringSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
    setSnapshot(null);
    setActiveAgreementModal(null);
    setPublicView({ kind: 'home' });
    void logOutUser().catch(() => {});
  }, []);

  const handleGoogleLogin = useCallback(
    async (role: PublicUserRole) => {
      try {
        const cred = await signInWithGoogle();
        const fbUser = cred.user;
        const data = await apiJson<{
          user: PlatformUser;
          snapshot: Record<string, unknown>;
        }>('/api/auth/google-sync', {
          method: 'POST',
          body: JSON.stringify({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            role,
          }),
        });
        applyAuthPayload(data.user, data.snapshot);
      } catch (err: unknown) {
        setGlobalError(
          err instanceof Error
            ? err.message
            : 'Google Sign-In could not be completed. Use Email & Password or Account Code sign in.'
        );
      }
    },
    [applyAuthPayload]
  );

  const unreadCount = useMemo(() => {
    if (!snapshot || !currentUser) return 0;
    const convUnread = (snapshot.conversations || []).reduce(
      (sum, c) => sum + (c.unreadByUser?.[currentUser.id] || 0),
      0
    );
    const notifUnread = (snapshot.notifications || []).filter((n) => !n.read).length;
    return convUnread + notifUnread;
  }, [snapshot, currentUser]);

  // Shared mutations updating live backend + hydrating role-scoped snapshot
  const handleUpdateProfile = async (
    profilePatch: Record<string, unknown>,
    organisationPatch?: Record<string, unknown>
  ) => {
    if (!currentUser) return { reverificationTriggered: false };
    const data = await apiJson<{
      user: PlatformUser;
      reverificationTriggered: boolean;
      snapshot: Record<string, unknown>;
    }>(`/api/profiles/${encodeURIComponent(currentUser.id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        actorId: currentUser.id,
        profilePatch,
        organisationPatch,
      }),
    });
    applyAuthPayload(data.user, data.snapshot);
    return { reverificationTriggered: Boolean(data.reverificationTriggered) };
  };

  const handleSendMessage = async (params: {
    recipientId: string;
    contextType: Conversation['contextType'];
    contextTitle: string;
    body: string;
    attachments?: string[];
    replyToId?: string;
    replyToPreview?: string;
  }) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        senderId: currentUser.id,
        ...params,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  const handleMarkConversationRead = async (conversationId?: string) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>('/api/messages/mark-read', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUser.id,
        conversationId,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  // Farmer support requests & agreements
  const handleCreateSupportRequest = async (draft: Partial<SupportRequest>) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>('/api/assistance-requests', {
      method: 'POST',
      body: JSON.stringify({
        ...draft,
        farmerId: currentUser.id,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  const handleSendOfferToFarmer = async (draft: {
    farmerId: string;
    title: string;
    supportCategory: AssistanceType;
    fundingOrMaterialContribution: string;
    contributionValueNaira: number;
    proposedConditions: string;
    usesThirtyPercentShare: boolean;
    shareType: ShareArrangementType;
    supervisionRecommended: boolean;
  }) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>('/api/sponsor-offers', {
      method: 'POST',
      body: JSON.stringify({
        sponsorId: currentUser.id,
        ...draft,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  const handleRespondToSupportRequest = async (
    requestId: string,
    action: 'ACCEPT_AND_DRAFT_AGREEMENT' | 'DECLINE' | 'REQUEST_INFO',
    note?: string,
    supervisionRequired?: boolean
  ) => {
    if (!currentUser) return;
    const data = await apiJson<{
      agreement?: SponsorFundingAgreement;
      snapshot: Record<string, unknown>;
    }>(`/api/assistance-requests/${encodeURIComponent(requestId)}/respond`, {
      method: 'POST',
      body: JSON.stringify({
        actorId: currentUser.id,
        action,
        note,
        supervisionRequired,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
    if (data.agreement) {
      setActiveAgreementModal(data.agreement);
    }
  };

  const handleRespondToSponsorOffer = async (
    offerId: string,
    decision: 'ACCEPT' | 'DECLINE' | 'REQUEST_INFO'
  ) => {
    if (!currentUser) return;
    const data = await apiJson<{
      agreement?: SponsorFundingAgreement;
      snapshot: Record<string, unknown>;
    }>(`/api/sponsor-offers/${encodeURIComponent(offerId)}/respond`, {
      method: 'POST',
      body: JSON.stringify({
        actorId: currentUser.id,
        decision,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
    if (data.agreement) {
      setActiveAgreementModal(data.agreement);
    }
  };

  const handleAcceptAgreement = async (agreementId: string) => {
    if (!currentUser) return;
    const data = await apiJson<{
      agreement: SponsorFundingAgreement;
      snapshot: Record<string, unknown>;
    }>(`/api/agreements/support/${encodeURIComponent(agreementId)}/accept`, {
      method: 'POST',
      body: JSON.stringify({ actorId: currentUser.id }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
    setActiveAgreementModal(data.agreement);
  };

  // Worker job publishing, applying, hiring, wage payments
  const handlePublishWorkerJob = async (draft: Partial<WorkerRequest>) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>('/api/worker-requests', {
      method: 'POST',
      body: JSON.stringify({
        ...draft,
        actorId: currentUser.id,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  const handleApplyForJob = async (params: {
    workerRequestId: string;
    proposedWageNaira: number;
    message: string;
  }) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>('/api/worker-applications', {
      method: 'POST',
      body: JSON.stringify({
        workerId: currentUser.id,
        ...params,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>(
      `/api/worker-applications/${encodeURIComponent(applicationId)}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({
          actorId: currentUser.id,
          decision: 'WITHDRAW',
        }),
      }
    );
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  const handleRespondToWorkerApp = async (
    applicationId: string,
    decision: 'HIRE' | 'DECLINE'
  ) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>(
      `/api/worker-applications/${encodeURIComponent(applicationId)}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({
          actorId: currentUser.id,
          decision,
        }),
      }
    );
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  const handleTransitionWorkerPayment = async (
    paymentId: string,
    action: 'FARMER_CONFIRM_WORK_AND_INITIATE' | 'WORKER_CONFIRM_RECEIPT'
  ) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>(
      `/api/worker-payments/${encodeURIComponent(paymentId)}/transition`,
      {
        method: 'POST',
        body: JSON.stringify({
          actorId: currentUser.id,
          action,
        }),
      }
    );
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  // Supervision workflow
  const handleRequestSupervision = async (params: {
    agreementId: string;
    agreementCategory: SupervisionRequest['agreementCategory'];
    invitedSupervisorId: string;
    supervisionInstructions: string;
  }) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>('/api/supervision/requests', {
      method: 'POST',
      body: JSON.stringify({
        actorId: currentUser.id,
        ...params,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  const handleRespondToInvitation = async (
    requestId: string,
    decision: 'ACCEPT' | 'DECLINE',
    note?: string
  ) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>(
      `/api/supervision/requests/${encodeURIComponent(requestId)}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({
          supervisorId: currentUser.id,
          decision,
          note,
        }),
      }
    );
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  const handleSubmitReport = async (params: {
    assignmentId: string;
    reportType: SupervisionReport['reportType'];
    summary: string;
    observations: string;
    recommendCompletion: boolean;
    evidenceUrls: string[];
  }) => {
    if (!currentUser) return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>('/api/supervision/reports', {
      method: 'POST',
      body: JSON.stringify({
        supervisorId: currentUser.id,
        ...params,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  // Admin verification & mediation
  const handleAdminVerifyUser = async (
    targetUserId: string,
    status: ProfileVerificationStatus,
    reviewerNotes?: string
  ) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>('/api/admin/verification', {
      method: 'POST',
      body: JSON.stringify({
        adminId: currentUser.id,
        targetUserId,
        status,
        reviewerNotes,
      }),
    });
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  const handleResolveDispute = async (disputeId: string, resolutionNotes: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    const data = await apiJson<{ snapshot: Record<string, unknown> }>(
      `/api/admin/disputes/${encodeURIComponent(disputeId)}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({
          adminId: currentUser.id,
          resolutionNotes,
        }),
      }
    );
    setSnapshot(data.snapshot as unknown as PlatformSnapshot);
  };

  if (restoringSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F8F3] text-sm font-semibold text-[#116B32]">
        Loading FarmFund workspace...
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {globalError && (
        <div
          role="alert"
          className="fixed top-4 right-4 z-50 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-900 shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{globalError}</span>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              className="font-bold text-red-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Logged-Out Routing: Public Homepage, Role Registration, or Sign In */}
      {!currentUser || !snapshot ? (
        publicView.kind === 'register' ? (
          <RoleRegistrationFlow
            role={publicView.role}
            onBackToHome={() => setPublicView({ kind: 'home' })}
            onSwitchToSignIn={() => setPublicView({ kind: 'signin', mode: 'public' })}
            onRegistered={applyAuthPayload}
          />
        ) : publicView.kind === 'signin' ? (
          <LoginModal
            initialMode={publicView.mode}
            onBackToHome={() => setPublicView({ kind: 'home' })}
            onGoToRoleRegistration={(role) => setPublicView({ kind: 'register', role })}
            onAuthenticated={applyAuthPayload}
            onGoogleLogin={handleGoogleLogin}
          />
        ) : (
          <PublicHomePage
            onSelectRegisterRole={(role) => setPublicView({ kind: 'register', role })}
            onOpenSignIn={(mode = 'public') => setPublicView({ kind: 'signin', mode })}
          />
        )
      ) : (
        <>
          {/* Strictly Role-Routed Dashboards */}
          {currentUser.role === 'Worker' && (() => {
            const wp = snapshot.workerProfiles.find((p) => p.userId === currentUser.id);
            if (!wp) return null;
            return (
              <WorkerDashboard
                key={currentUser.id}
                user={currentUser}
                workerProfile={wp}
                workerRequests={snapshot.workerRequests}
                workerApplications={snapshot.workerApplications}
                workerAgreements={snapshot.workerAgreements}
                workerPayments={snapshot.workerPayments}
                conversations={snapshot.conversations}
                messages={snapshot.messages}
                notifications={snapshot.notifications}
                unreadCount={unreadCount}
                onApplyForJob={handleApplyForJob}
                onWithdrawApplication={handleWithdrawApplication}
                onConfirmWageReceipt={(paymentId) =>
                  handleTransitionWorkerPayment(paymentId, 'WORKER_CONFIRM_RECEIPT')
                }
                onUpdateProfile={(patch) => handleUpdateProfile(patch)}
                onSendMessage={handleSendMessage}
                onMarkConversationRead={handleMarkConversationRead}
                onSignOut={handleSignOut}
              />
            );
          })()}

          {currentUser.role === 'Farmer' && (() => {
            const fp = snapshot.farmerProfiles.find((p) => p.userId === currentUser.id);
            if (!fp) return null;
            return (
              <FarmerDashboard
                key={currentUser.id}
                user={currentUser}
                farmerProfile={fp}
                sponsorProfiles={snapshot.sponsorProfiles}
                organisations={snapshot.organisations}
                supervisorProfiles={snapshot.supervisorProfiles}
                supportRequests={snapshot.assistanceRequests}
                sponsorOffers={snapshot.sponsorOffers}
                sponsorAgreements={snapshot.supportAgreements}
                workerRequests={snapshot.workerRequests}
                workerApplications={snapshot.workerApplications}
                workerAgreements={snapshot.workerAgreements}
                workerPayments={snapshot.workerPayments}
                supervisionRequests={snapshot.supervisionRequests}
                supervisionAssignments={snapshot.supervisionAssignments}
                supervisionReports={snapshot.supervisionReports}
                conversations={snapshot.conversations}
                messages={snapshot.messages}
                notifications={snapshot.notifications}
                unreadCount={unreadCount}
                onCreateSupportRequest={handleCreateSupportRequest}
                onRespondToSponsorOffer={handleRespondToSponsorOffer}
                onOpenAgreementModal={setActiveAgreementModal}
                onCreateWorkerJob={handlePublishWorkerJob}
                onRespondToWorkerApp={handleRespondToWorkerApp}
                onInitiateWorkerWagePayment={(paymentId) =>
                  handleTransitionWorkerPayment(paymentId, 'FARMER_CONFIRM_WORK_AND_INITIATE')
                }
                onRequestSupervision={handleRequestSupervision}
                onUpdateProfile={(patch) => handleUpdateProfile(patch)}
                onSendMessage={handleSendMessage}
                onMarkConversationRead={handleMarkConversationRead}
                onSignOut={handleSignOut}
              />
            );
          })()}

          {currentUser.role === 'Supervisor' && (() => {
            const sp = snapshot.supervisorProfiles.find((p) => p.userId === currentUser.id);
            if (!sp) return null;
            return (
              <SupervisorDashboard
                key={currentUser.id}
                user={currentUser}
                supervisorProfile={sp}
                supervisionRequests={snapshot.supervisionRequests}
                supervisionAssignments={snapshot.supervisionAssignments}
                supervisionReports={snapshot.supervisionReports}
                workerPayments={snapshot.workerPayments}
                conversations={snapshot.conversations}
                messages={snapshot.messages}
                notifications={snapshot.notifications}
                unreadCount={unreadCount}
                onRespondToInvitation={handleRespondToInvitation}
                onSubmitReport={handleSubmitReport}
                onUpdateProfile={(patch) => handleUpdateProfile(patch)}
                onSendMessage={handleSendMessage}
                onMarkConversationRead={handleMarkConversationRead}
                onSignOut={handleSignOut}
              />
            );
          })()}

          {currentUser.role === 'Sponsor' && (() => {
            const sp = snapshot.sponsorProfiles.find((p) => p.userId === currentUser.id);
            if (!sp) return null;
            const org = snapshot.organisations.find((o) => o.userId === currentUser.id);
            return (
              <SponsorDashboard
                key={currentUser.id}
                user={currentUser}
                sponsorProfile={sp}
                organisationProfile={org}
                farmerProfiles={snapshot.farmerProfiles}
                workerProfiles={snapshot.workerProfiles}
                supervisorProfiles={snapshot.supervisorProfiles}
                supportRequests={snapshot.assistanceRequests}
                sponsorOffers={snapshot.sponsorOffers}
                sponsorAgreements={snapshot.supportAgreements}
                workerRequests={snapshot.workerRequests}
                workerApplications={snapshot.workerApplications}
                workerAgreements={snapshot.workerAgreements}
                workerPayments={snapshot.workerPayments}
                supervisionRequests={snapshot.supervisionRequests}
                supervisionAssignments={snapshot.supervisionAssignments}
                supervisionReports={snapshot.supervisionReports}
                conversations={snapshot.conversations}
                messages={snapshot.messages}
                notifications={snapshot.notifications}
                unreadCount={unreadCount}
                onSendOfferToFarmer={handleSendOfferToFarmer}
                onRespondToSupportRequest={handleRespondToSupportRequest}
                onOpenAgreementModal={setActiveAgreementModal}
                onPublishWorkerJob={handlePublishWorkerJob}
                onRespondToWorkerApp={handleRespondToWorkerApp}
                onInitiateWorkerWagePayment={(paymentId) =>
                  handleTransitionWorkerPayment(paymentId, 'FARMER_CONFIRM_WORK_AND_INITIATE')
                }
                onRequestSupervision={handleRequestSupervision}
                onUpdateProfile={(patch, orgPatch) => handleUpdateProfile(patch, orgPatch)}
                onSendMessage={handleSendMessage}
                onMarkConversationRead={handleMarkConversationRead}
                onSignOut={handleSignOut}
              />
            );
          })()}

          {currentUser.role === 'Admin' && (
            <AdminDashboard
              key={currentUser.id}
              adminUser={currentUser}
              activeTab={adminTab}
              onSelectTab={setAdminTab}
              users={snapshot.users}
              workerProfiles={snapshot.workerProfiles}
              farmerProfiles={snapshot.farmerProfiles}
              supervisorProfiles={snapshot.supervisorProfiles}
              sponsorProfiles={snapshot.sponsorProfiles}
              organisations={snapshot.organisations}
              verificationApplications={snapshot.verificationApplications}
              supportRequests={snapshot.assistanceRequests}
              sponsorOffers={snapshot.sponsorOffers}
              workerRequests={snapshot.workerRequests}
              workerApplications={snapshot.workerApplications}
              sponsorAgreements={snapshot.supportAgreements}
              supervisionRequests={snapshot.supervisionRequests}
              supervisionAssignments={snapshot.supervisionAssignments}
              supervisionReports={snapshot.supervisionReports}
              workerPayments={snapshot.workerPayments}
              disputes={snapshot.disputes}
              adminAuditLogs={snapshot.adminAuditLogs}
              onReviewSponsorAgreement={setActiveAgreementModal}
              onVerifyUser={handleAdminVerifyUser}
              onResolveDispute={handleResolveDispute}
              onSignOut={handleSignOut}
            />
          )}

          <SponsorAgreementModal
            agreement={activeAgreementModal}
            activeRole={currentUser.role}
            onClose={() => setActiveAgreementModal(null)}
            onAcceptAgreement={(agrId) => void handleAcceptAgreement(agrId)}
          />
        </>
      )}
    </ErrorBoundary>
  );
}

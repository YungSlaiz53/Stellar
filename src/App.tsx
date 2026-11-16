import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import {
  BarChart3,
  Grid,
  Home,
  Map,
  Upload,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import {
  auth,
  db,
  handleFirestoreError,
  logOutUser,
  OperationType,
  signInWithGoogle,
} from './firebase';
import {
  DirectMessage,
  DisputeRecord,
  SponsorFundingAgreement,
  SupportRequest,
  UserRole,
  WorkerAgreement,
  WorkerApplication,
  WorkerPayment,
  WorkerProfile,
  WorkerRequest,
} from './types/farmfund';
import {
  INITIAL_DISPUTES,
  INITIAL_MESSAGES,
  INITIAL_SPONSOR_AGREEMENTS,
  INITIAL_SUPPORT_REQUESTS,
  INITIAL_WORKER_AGREEMENTS,
  INITIAL_WORKER_APPLICATIONS,
  INITIAL_WORKER_PAYMENTS,
  INITIAL_WORKER_PROFILES,
  INITIAL_WORKER_REQUESTS,
} from './data/seedData';
import {
  acceptSponsorAgreementParty,
  evaluateWorkerPaymentTransition,
} from './utils/farmfundLogic';
import { FarmerRequestSystem, FarmerTab } from './components/FarmerRequestSystem';
import {
  WorkerMarketplaceAndDashboard,
  WorkerTab,
} from './components/WorkerMarketplaceAndDashboard';
import { AdminDashboard, AdminTab } from './components/AdminDashboard';
import { SponsorMarketplaceView, SponsorTab } from './components/SponsorMarketplaceView';
import { SponsorAgreementModal } from './components/SponsorAgreementModal';
import { LoginPage } from './components/LoginPage';
import { SmartFarmHomeDashboard } from './components/SmartFarmHomeDashboard';
import { StellarWalletDashboard } from './components/StellarWalletDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

export type FarmerWorkerSection = 'Home' | 'Data' | 'Workers' | 'Field' | 'Profile' | 'Wallet';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Login Landing Page state (First landing page by default; supports ?autostart=1)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('autostart') === '1';
    }
    return false;
  });
  const [sessionDisplayName, setSessionDisplayName] = useState<string>('Adewale Ogunleye');
  const [sessionUserId, setSessionUserId] = useState<string>('demo_farmer_1');

  // Role & Navigation State
  // - Farmer/Worker share a merged dashboard ('Home' | 'Data' | 'Workers' | 'Field' | 'Profile' | 'Wallet')
  // - Sponsor & Company have a dedicated institutional dashboard with ONLY 3 tabs ('Home' | 'Upload Request' | 'Profile') + embedded Stellar wallet
  // - Admin has a unique login leading directly to AdminDashboard
  const [activeRole, setActiveRole] = useState<UserRole>('Farmer');
  const [fwSection, setFwSection] = useState<FarmerWorkerSection>('Home');
  const [farmerTab, setFarmerTab] = useState<FarmerTab>('Request Farm Support');
  const [workerTab, setWorkerTab] = useState<WorkerTab>('Find Farm Jobs');
  const [sponsorTab, setSponsorTab] = useState<SponsorTab>('Home');
  const [adminTab, setAdminTab] = useState<AdminTab>('Farm Support Requests');

  // Application Data State
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>(
    INITIAL_SUPPORT_REQUESTS
  );
  const [sponsorAgreements, setSponsorAgreements] = useState<SponsorFundingAgreement[]>(
    INITIAL_SPONSOR_AGREEMENTS
  );
  const [workerRequests, setWorkerRequests] = useState<WorkerRequest[]>(
    INITIAL_WORKER_REQUESTS
  );
  const [workerProfiles, setWorkerProfiles] = useState<WorkerProfile[]>(
    INITIAL_WORKER_PROFILES
  );
  const [workerApplications, setWorkerApplications] = useState<WorkerApplication[]>(
    INITIAL_WORKER_APPLICATIONS
  );
  const [workerAgreements, setWorkerAgreements] = useState<WorkerAgreement[]>(
    INITIAL_WORKER_AGREEMENTS
  );
  const [workerPayments, setWorkerPayments] = useState<WorkerPayment[]>(
    INITIAL_WORKER_PAYMENTS
  );
  const [messages, setMessages] = useState<DirectMessage[]>(INITIAL_MESSAGES);
  const [disputes, setDisputes] = useState<DisputeRecord[]>(INITIAL_DISPUTES);

  // Active Agreement Modal
  const [selectedAgreementId, setSelectedAgreementId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setIsLoggedIn(true);
        setSessionUserId(user.uid);
        if (user.displayName) {
          setSessionDisplayName(user.displayName);
        }
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Attach authenticated Firestore listeners when signed in
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const profileRef = doc(db, 'workerProfiles', currentUser.uid);
    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as WorkerProfile;
          setWorkerProfiles((prev) => {
            const exists = prev.some((p) => p.id === data.id);
            return exists ? prev.map((p) => (p.id === data.id ? data : p)) : [data, ...prev];
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `workerProfiles/${currentUser.uid}`);
      }
    );

    return () => {
      unsubProfile();
    };
  }, [authReady, currentUser]);

  // Helper to persist document when authenticated with verified email
  const persistIfAuthenticated = async (
    collectionName: string,
    docId: string,
    payload: unknown
  ) => {
    if (!currentUser || !currentUser.emailVerified) return;
    const path = `${collectionName}/${docId}`;
    try {
      await setDoc(doc(db, collectionName, docId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Handlers for System A: Farm Support & 30% Sponsor Share Agreements
  const handleCreateSupportRequest = (
    draft: Omit<SupportRequest, 'id' | 'createdAt' | 'status'>
  ) => {
    const id = `sup_req_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const newReq: SupportRequest = {
      ...draft,
      id,
      farmerId: currentUser?.uid || sessionUserId || draft.farmerId,
      status: 'Open',
      createdAt,
    };
    setSupportRequests((prev) => [newReq, ...prev]);
    void persistIfAuthenticated('supportRequests', id, newReq);
  };

  const handleCreateSponsorAgreementProposal = (req: SupportRequest) => {
    const id = `spn_agr_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newAgr: SponsorFundingAgreement = {
      id,
      requestId: req.id,
      requestTitle: req.title,
      farmerId: req.farmerId,
      farmerName: req.farmerName,
      sponsorId: currentUser?.uid || sessionUserId || 'demo_sponsor_1',
      sponsorName: currentUser?.displayName || sessionDisplayName || 'AgroVanguard Capital NG',
      sponsorContribution:
        req.fundingAmount > 0
          ? `₦${req.fundingAmount.toLocaleString('en-NG')} + ${req.materialsOrEquipment || 'Agreed agricultural inputs'}`
          : req.materialsOrEquipment || 'Agreed agricultural inputs',
      contributionValueNaira: req.fundingAmount || 1500000,
      sharePercentage: 30,
      shareType: req.preferredShareModel,
      calculationMethod:
        req.preferredShareModel === '30% Farm Produce Share'
          ? `30% of net graded harvest from ${req.farmName} (${req.cropOrProduceType}) measured at farmgate.`
          : `30% of net verified farm proceeds from ${req.cropOrProduceType} harvest sales after documented transport costs.`,
      entitlementTiming:
        'Within 14 calendar days following harvest verification and joint off-take or warehouse tally.',
      measurementVerification:
        'Verified via calibrated digital scale weighbridge tickets and joint inspection signed by both Farmer and Sponsor.',
      lossOrPoorHarvestClause:
        'In case of verified drought, flood, or pest loss, the 30% share applies only to surviving net output/proceeds. No guaranteed profit or debt penalty.',
      additionalConditions:
        'Monthly progress photos uploaded via FarmFund; subject to Nigerian legal and regulatory review.',
      farmerAccepted: false,
      farmerAcceptedAt: '',
      sponsorAccepted: false,
      sponsorAcceptedAt: '',
      status: 'Pending Acceptance',
      historyLog: [
        `${nowIso.slice(0, 10)}: Drafted ${req.preferredShareModel} agreement for review by both Farmer and Sponsor.`,
      ],
      createdAt: nowIso,
    };

    setSponsorAgreements((prev) => [newAgr, ...prev]);
    setSupportRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'Agreement Pending' } : r))
    );
    setSelectedAgreementId(newAgr.id);
  };

  const handleAcceptSponsorAgreement = (agreementId: string, party: 'Farmer' | 'Sponsor') => {
    const nowIso = new Date().toISOString();
    setSponsorAgreements((prev) =>
      prev.map((agr) => {
        if (agr.id !== agreementId) return agr;
        const updated = acceptSponsorAgreementParty(agr, party, nowIso);
        if (updated.status === 'Active Agreement') {
          setSupportRequests((reqs) =>
            reqs.map((r) => (r.id === agr.requestId ? { ...r, status: 'Active Support' } : r))
          );
        }
        return updated;
      })
    );
  };

  // Handlers for System B: Farm Worker Requests, Marketplace & Direct Wages (0% Sponsor Share)
  const handleCreateWorkerRequest = (
    draft: Omit<WorkerRequest, 'id' | 'createdAt' | 'status' | 'workersHired'>
  ) => {
    const id = `wrk_req_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const newWreq: WorkerRequest = {
      ...draft,
      id,
      farmerId: currentUser?.uid || sessionUserId || draft.farmerId,
      workersHired: 0,
      status: 'Open',
      createdAt,
    };
    setWorkerRequests((prev) => [newWreq, ...prev]);
    void persistIfAuthenticated('workerRequests', id, newWreq);
  };

  const handleApplyForJob = (params: {
    workerRequest: WorkerRequest;
    proposedWageNaira: number;
    message: string;
  }) => {
    const currentWorker = workerProfiles[0];
    const id = `wrk_app_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const newApp: WorkerApplication = {
      id,
      workerRequestId: params.workerRequest.id,
      jobTitle: params.workerRequest.jobTitle,
      workCategory: params.workerRequest.workCategory,
      location: params.workerRequest.location,
      farmerId: params.workerRequest.farmerId,
      farmerName: params.workerRequest.farmerName,
      workerId: currentWorker.userId,
      workerName: currentWorker.fullName,
      workerSkills: currentWorker.skills.join(', '),
      proposedWageNaira: params.proposedWageNaira,
      message: params.message,
      status: 'Applied',
      createdAt,
    };
    setWorkerApplications((prev) => [newApp, ...prev]);
  };

  const handleRespondToJobOffer = (
    applicationId: string,
    decision: 'ACCEPT' | 'DECLINE'
  ) => {
    const targetApp = workerApplications.find((a) => a.id === applicationId);
    if (!targetApp) return;

    setWorkerApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              status: decision === 'ACCEPT' ? 'Accepted by Worker' : 'Declined by Worker',
            }
          : app
      )
    );

    if (decision === 'ACCEPT') {
      const parentJob = workerRequests.find((r) => r.id === targetApp.workerRequestId);
      const agrId = `wrk_agr_${Date.now()}`;
      const payId = `wrk_pay_${Date.now()}`;
      const nowIso = new Date().toISOString();

      const newAgr: WorkerAgreement = {
        id: agrId,
        workerRequestId: targetApp.workerRequestId,
        applicationId: targetApp.id,
        jobTitle: targetApp.jobTitle,
        farmerId: targetApp.farmerId,
        farmerName: targetApp.farmerName,
        workerId: targetApp.workerId,
        workerName: targetApp.workerName,
        agreedWageNaira: targetApp.proposedWageNaira,
        paymentBasis: parentJob?.paymentBasis || 'Per Worker (Total Task)',
        paymentMethod: parentJob?.paymentMethod || 'Embedded Stellar USDC Wallet',
        startDate: parentJob?.startDate || '2026-11-26',
        expectedDuration: parentJob?.expectedDuration || '4 Days',
        workCompletedConfirmed: false,
        status: 'Active Work',
        createdAt: nowIso,
      };

      const newPay: WorkerPayment = {
        id: payId,
        workerAgreementId: agrId,
        workerRequestId: targetApp.workerRequestId,
        jobTitle: targetApp.jobTitle,
        farmerId: targetApp.farmerId,
        farmerName: targetApp.farmerName,
        workerId: targetApp.workerId,
        workerName: targetApp.workerName,
        amountNaira: targetApp.proposedWageNaira,
        sponsorShareDeducted: 0,
        paymentMethod: parentJob?.paymentMethod || 'Embedded Stellar USDC Wallet',
        workConfirmedByFarmer: false,
        paymentConfirmedByWorker: false,
        status: 'Pending Work Completion',
        paidAt: '',
        createdAt: nowIso,
      };

      setWorkerAgreements((prev) => [newAgr, ...prev]);
      setWorkerPayments((prev) => [newPay, ...prev]);
      setWorkerRequests((prev) =>
        prev.map((r) =>
          r.id === targetApp.workerRequestId
            ? {
                ...r,
                workersHired: Math.min(r.workersNeeded, r.workersHired + 1),
                status: 'Hiring in Progress',
              }
            : r
        )
      );
    }
  };

  const handleConfirmPaymentReceipt = (paymentId: string) => {
    const nowIso = new Date().toISOString();
    setWorkerPayments((prev) =>
      prev.map((pay) =>
        pay.id === paymentId
          ? evaluateWorkerPaymentTransition(pay, 'WORKER_CONFIRM_RECEIPT', nowIso)
          : pay
      )
    );
  };

  const handleUpdateWorkerProfile = (updated: WorkerProfile) => {
    setWorkerProfiles((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    if (currentUser) {
      void persistIfAuthenticated('workerProfiles', currentUser.uid, {
        ...updated,
        id: currentUser.uid,
        userId: currentUser.uid,
      });
    }
  };

  const handleSendMessage = (params: {
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    recipientId: string;
    recipientName: string;
    contextTitle: string;
    body: string;
    replyToId?: string;
    replyToPreview?: string;
  }) => {
    const msg: DirectMessage = {
      id: `msg_${Date.now()}`,
      ...params,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [msg, ...prev]);
  };

  const handleToggleWorkerVerification = (workerProfileId: string) => {
    setWorkerProfiles((prev) =>
      prev.map((p) =>
        p.id === workerProfileId
          ? {
              ...p,
              verificationStatus:
                p.verificationStatus === 'Verified' ? 'Pending Verification' : 'Verified',
            }
          : p
      )
    );
  };

  const handleResolveDispute = (disputeId: string, resolutionNotes: string) => {
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === disputeId ? { ...d, status: 'Resolved', resolutionNotes } : d
      )
    );
  };

  const activeAgreementModalData =
    sponsorAgreements.find((a) => a.id === selectedAgreementId) || null;

  // 1. Show Login Page as the first landing page when not logged in
  if (!isLoggedIn) {
    return (
      <ErrorBoundary>
        <LoginPage
          onLoginSuccess={(role, displayName, uid) => {
            setActiveRole(role);
            if (displayName) setSessionDisplayName(displayName);
            if (uid) setSessionUserId(uid);
            setFwSection('Home');
            setSponsorTab('Home');
            setIsLoggedIn(true);
          }}
          onGoogleLogin={async (role) => {
            setActiveRole(role);
            try {
              await signInWithGoogle();
              setFwSection('Home');
              setSponsorTab('Home');
              setIsLoggedIn(true);
            } catch {
              setFwSection('Home');
              setSponsorTab('Home');
              setIsLoggedIn(true);
            }
          }}
        />
      </ErrorBoundary>
    );
  }

  // 2. Unique Admin Dashboard View (Edit 4: Admin login is a unique login to Admin Dashboard; no Admin Console in public nav)
  if (activeRole === 'Admin') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-100 pb-12 text-slate-900">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-8 border-b border-slate-200 bg-slate-900 px-6 py-3.5 text-white">
            <span className="font-display text-xl font-bold tracking-tight text-white">
              FarmFund · Admin Oversight Portal
            </span>
            <button
              type="button"
              onClick={() => {
                if (currentUser) void logOutUser();
                setIsLoggedIn(false);
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Sign Out Admin ({sessionDisplayName.split(' ')[0]})
            </button>
          </header>

          <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <AdminDashboard
              activeTab={adminTab}
              onSelectTab={setAdminTab}
              supportRequests={supportRequests}
              workerRequests={workerRequests}
              workerProfiles={workerProfiles}
              workerApplications={workerApplications}
              sponsorAgreements={sponsorAgreements}
              workerPayments={workerPayments}
              disputes={disputes}
              onReviewSponsorAgreement={(agr) => setSelectedAgreementId(agr.id)}
              onToggleWorkerVerification={handleToggleWorkerVerification}
              onResolveDispute={handleResolveDispute}
            />

            <StellarWalletDashboard
              userId={currentUser?.uid || sessionUserId || 'admin_oversight_1'}
              userName={sessionDisplayName}
              role="Admin"
              supportRequests={supportRequests}
              workerRequests={workerRequests}
            />
          </main>

          <SponsorAgreementModal
            agreement={activeAgreementModalData}
            activeRole="Admin"
            onClose={() => setSelectedAgreementId(null)}
            onAcceptAgreement={handleAcceptSponsorAgreement}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // 3. Distinct Sponsor & Company Dashboard (Edits 9, 10, 11: Only Home, Upload Request, and Profile; no Field, Data, or Workers)
  if (activeRole === 'Sponsor' || activeRole === 'Company') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-100 pb-20 text-slate-900">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-8 border-b border-indigo-950/20 bg-slate-950 px-6 py-3.5 text-white">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setSponsorTab('Home');
              }}
              className="font-display text-xl font-bold tracking-tight text-amber-300 whitespace-nowrap shrink-0"
            >
              FarmFund · {activeRole === 'Company' ? 'Corporate Sponsor Desk' : 'Sponsor Desk'}
            </a>

            {/* Zone 2: Strictly Home, Upload Request, Profile */}
            <nav
              aria-label="Sponsor Primary Navigation"
              className="hidden md:flex items-center gap-6 text-sm font-medium text-indigo-200"
            >
              <button
                type="button"
                onClick={() => setSponsorTab('Home')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  sponsorTab === 'Home'
                    ? 'font-bold text-amber-300 underline underline-offset-8'
                    : 'hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => setSponsorTab('Upload Request')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  sponsorTab === 'Upload Request'
                    ? 'font-bold text-amber-300 underline underline-offset-8'
                    : 'hover:text-white'
                }`}
              >
                Upload Request
              </button>
              <button
                type="button"
                onClick={() => setSponsorTab('Profile')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  sponsorTab === 'Profile'
                    ? 'font-bold text-amber-300 underline underline-offset-8'
                    : 'hover:text-white'
                }`}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRole('Farmer');
                  setSessionUserId('demo_farmer_1');
                  setFwSection('Home');
                }}
                className="text-xs text-indigo-300 hover:text-white whitespace-nowrap shrink-0"
              >
                Farmer &amp; Worker Portal →
              </button>
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (currentUser) void logOutUser();
                  setIsLoggedIn(false);
                }}
                className="rounded-lg border border-indigo-700 bg-indigo-950 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-900 whitespace-nowrap shrink-0"
              >
                Sign Out ({sessionDisplayName.split(' ')[0]})
              </button>
            </div>
          </header>

          <main id="top" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <StellarWalletDashboard
              userId={currentUser?.uid || sessionUserId || 'demo_sponsor_1'}
              userName={sessionDisplayName}
              role={activeRole}
              supportRequests={supportRequests}
              workerRequests={workerRequests}
            />

            <SponsorMarketplaceView
              activeTab={sponsorTab}
              onSelectTab={setSponsorTab}
              sponsorName={sessionDisplayName}
              supportRequests={supportRequests}
              sponsorAgreements={sponsorAgreements}
              workerRequests={workerRequests}
              onReviewSponsorAgreement={(agr) => setSelectedAgreementId(agr.id)}
              onCreateSponsorAgreementProposal={handleCreateSponsorAgreementProposal}
              onUploadSponsorRequestForWorkersAndFarmers={handleCreateWorkerRequest}
            />
          </main>

          {/* Sponsor Bottom Bar: ONLY Home, Upload Request, and Profile (Edit 11: removed Field, Data, Workers) */}
          <nav
            aria-label="Sponsor Bottom Navigation"
            className="fixed right-0 bottom-0 left-0 z-30 border-t border-indigo-900/30 bg-slate-950/95 text-white backdrop-blur-md"
          >
            <div className="mx-auto grid h-14 max-w-md grid-cols-3 items-center px-2">
              <button
                type="button"
                onClick={() => setSponsorTab('Home')}
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  sponsorTab === 'Home' ? 'text-amber-300' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <Home className="h-5 w-5" />
                <span className="mt-0.5 text-[10px] font-semibold">Home</span>
              </button>

              <button
                type="button"
                onClick={() => setSponsorTab('Upload Request')}
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  sponsorTab === 'Upload Request'
                    ? 'text-amber-300'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                <Upload className="h-5 w-5" />
                <span className="mt-0.5 text-[10px] font-semibold whitespace-nowrap">
                  Upload Request
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSponsorTab('Profile')}
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  sponsorTab === 'Profile' ? 'text-amber-300' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <UserIcon className="h-5 w-5" />
                <span className="mt-0.5 text-[10px] font-semibold">Profile</span>
              </button>
            </div>
          </nav>

          <SponsorAgreementModal
            agreement={activeAgreementModalData}
            activeRole="Sponsor"
            onClose={() => setSelectedAgreementId(null)}
            onAcceptAgreement={handleAcceptSponsorAgreement}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // 4. Merged Farmer & Worker Dashboard (Edit 4: No Admin Console in nav; Edit 9: Merged Farmer & Worker experience)
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-8 border-b border-slate-200 bg-white/95 px-6 py-3.5 backdrop-blur-xs">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setFwSection('Home');
            }}
            className="font-display text-xl font-bold tracking-tight text-emerald-950 whitespace-nowrap shrink-0"
          >
            FarmFund
          </a>

          {/* Zone 2: Concise navigation links (No Admin Console per Edit 4) */}
          <nav
            aria-label="Primary Workspace Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => setFwSection('Home')}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                fwSection === 'Home'
                  ? 'font-bold text-[#159B42] underline underline-offset-8'
                  : 'hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setFarmerTab('Request Farm Support');
                setFwSection('Data');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                fwSection === 'Data'
                  ? 'font-bold text-[#159B42] underline underline-offset-8'
                  : 'hover:text-slate-900'
              }`}
            >
              Request Page
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkerTab('Find Farm Jobs');
                setFwSection('Workers');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                fwSection === 'Workers' || fwSection === 'Field'
                  ? 'font-bold text-[#159B42] underline underline-offset-8'
                  : 'hover:text-slate-900'
              }`}
            >
              Farm Jobs &amp; Messages
            </button>
            <button
              type="button"
              onClick={() => setFwSection('Wallet')}
              className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                fwSection === 'Wallet'
                  ? 'font-bold text-[#159B42] underline underline-offset-8'
                  : 'hover:text-slate-900'
              }`}
            >
              <Wallet className="h-4 w-4 text-[#159B42]" />
              <span>Stellar Wallet</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveRole('Sponsor');
                setSessionUserId('demo_sponsor_1');
                setSponsorTab('Home');
              }}
              className="transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Sponsor Dashboard
            </button>
          </nav>

          {/* Zone 3: Sign Out */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (currentUser) void logOutUser();
                setIsLoggedIn(false);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Sign Out ({sessionDisplayName.split(' ')[0]})
            </button>
          </div>
        </header>

        {/* Main Content Container */}
        <main id="top" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {fwSection === 'Home' && (
            <>
              <SmartFarmHomeDashboard
                activeRole={activeRole}
                userName={sessionDisplayName}
                supportRequests={supportRequests}
                sponsorAgreements={sponsorAgreements}
                workerRequests={workerRequests}
                workerPayments={workerPayments}
                onOpenFarmerRequestTab={(tab) => {
                  setFarmerTab(tab);
                  setFwSection('Data');
                }}
                onOpenWorkerTab={(tab) => {
                  setWorkerTab(tab);
                  if (tab === 'Messages') {
                    setFwSection('Field');
                  } else if (tab === 'My Profile') {
                    setFwSection('Profile');
                  } else {
                    setFwSection('Workers');
                  }
                }}
                onNavigateRole={(role) => {
                  setActiveRole(role);
                }}
                onReviewSponsorAgreement={(agr) => setSelectedAgreementId(agr.id)}
              />

              <StellarWalletDashboard
                userId={currentUser?.uid || sessionUserId || 'demo_farmer_1'}
                userName={sessionDisplayName}
                role={activeRole}
                supportRequests={supportRequests}
                workerRequests={workerRequests}
              />
            </>
          )}

          {fwSection === 'Wallet' && (
            <StellarWalletDashboard
              userId={currentUser?.uid || sessionUserId || 'demo_farmer_1'}
              userName={sessionDisplayName}
              role={activeRole}
              supportRequests={supportRequests}
              workerRequests={workerRequests}
            />
          )}

          {fwSection === 'Data' && (
            <FarmerRequestSystem
              activeTab={farmerTab}
              onSelectTab={setFarmerTab}
              supportRequests={supportRequests}
              sponsorAgreements={sponsorAgreements}
              onSubmitSupportRequest={handleCreateSupportRequest}
              onReviewSponsorAgreement={(agr) => setSelectedAgreementId(agr.id)}
              onCreateSponsorAgreementProposal={handleCreateSponsorAgreementProposal}
            />
          )}

          {(fwSection === 'Workers' || fwSection === 'Field' || fwSection === 'Profile') && (
            <WorkerMarketplaceAndDashboard
              activeTab={workerTab}
              onSelectTab={(tab) => {
                setWorkerTab(tab);
                if (tab === 'Messages') {
                  setFwSection('Field');
                } else if (tab === 'My Profile') {
                  setFwSection('Profile');
                } else {
                  setFwSection('Workers');
                }
              }}
              workerRequests={workerRequests}
              workerApplications={workerApplications}
              workerAgreements={workerAgreements}
              workerPayments={workerPayments}
              currentWorkerProfile={workerProfiles[0]}
              messages={messages}
              onApplyForJob={handleApplyForJob}
              onRespondToJobOffer={handleRespondToJobOffer}
              onConfirmPaymentReceipt={handleConfirmPaymentReceipt}
              onUpdateWorkerProfile={handleUpdateWorkerProfile}
              onSendMessageToFarmer={(
                farmerId,
                farmerName,
                contextTitle,
                body,
                replyToId,
                replyToPreview
              ) =>
                handleSendMessage({
                  senderId: workerProfiles[0].userId,
                  senderName: sessionDisplayName || workerProfiles[0].fullName,
                  senderRole: 'Worker',
                  recipientId: farmerId,
                  recipientName: farmerName,
                  contextTitle,
                  body,
                  replyToId,
                  replyToPreview,
                })
              }
            />
          )}
        </main>

        {/* Bottom 5-Item Navigation Bar for Unified Farmer & Worker Dashboard */}
        <nav
          aria-label="SmartFarm Bottom Navigation"
          className="fixed right-0 bottom-0 left-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md"
        >
          <div className="mx-auto grid h-14 max-w-2xl grid-cols-5 items-center px-2">
            <button
              type="button"
              onClick={() => setFwSection('Home')}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                fwSection === 'Home' ? 'text-[#159B42]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] font-semibold">Home</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFarmerTab('Request Farm Support');
                setFwSection('Data');
              }}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                fwSection === 'Data' ? 'text-[#159B42]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] font-medium whitespace-nowrap">Data</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWorkerTab('Find Farm Jobs');
                setFwSection('Workers');
              }}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                fwSection === 'Workers'
                  ? 'text-[#159B42]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Grid className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] font-medium whitespace-nowrap">Workers</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWorkerTab('Messages');
                setFwSection('Field');
              }}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                fwSection === 'Field' ? 'text-[#159B42]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Map className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] font-medium whitespace-nowrap">Field</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWorkerTab('My Profile');
                setFwSection('Profile');
              }}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                fwSection === 'Profile'
                  ? 'text-[#159B42]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserIcon className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] font-medium">Profile</span>
            </button>
          </div>
        </nav>

        {/* Sponsor 30% Agreement Review & Dual-Acceptance Modal */}
        <SponsorAgreementModal
          agreement={activeAgreementModalData}
          activeRole="Farmer"
          onClose={() => setSelectedAgreementId(null)}
          onAcceptAgreement={handleAcceptSponsorAgreement}
        />
      </div>
    </ErrorBoundary>
  );
}

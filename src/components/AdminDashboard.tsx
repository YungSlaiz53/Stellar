import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  LogOut,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  AcceptanceFeeRecord,
  AdminAuditLog,
  DisputeRecord,
  FarmerProfile,
  OrganisationProfile,
  PlatformUser,
  ProfileVerificationStatus,
  SponsorFundingAgreement,
  SponsorOffer,
  SponsorProfile,
  SupervisionAssignment,
  SupervisionReport,
  SupervisionRequest,
  SupervisorProfile,
  SupportFundingAgreementRecord,
  SupportRequest,
  UserWallet,
  VerificationApplication,
  WalletAuditLog,
  WalletTransaction,
  WorkerApplication,
  WorkerPayment,
  WorkerPaymentAgreementRecord,
  WorkerProfile,
  WorkerRequest,
} from '../types/farmfund';
import { computeSeparatedPlatformMetrics } from '../utils/farmfundLogic';

export type AdminTab =
  | 'Verification & Users'
  | 'Role Profiles'
  | 'Farm Support & Offers'
  | 'Worker Jobs & Applications'
  | 'Support Agreements'
  | 'Supervision Oversight'
  | 'Worker Payment Records'
  | 'Disputes & Audit Logs'
  | 'Stellar Wallets & Escrows';

interface AdminDashboardProps {
  adminUser: PlatformUser;
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  users: PlatformUser[];
  workerProfiles: WorkerProfile[];
  farmerProfiles: FarmerProfile[];
  supervisorProfiles: SupervisorProfile[];
  sponsorProfiles: SponsorProfile[];
  organisations: OrganisationProfile[];
  verificationApplications: VerificationApplication[];
  supportRequests: SupportRequest[];
  sponsorOffers: SponsorOffer[];
  workerRequests: WorkerRequest[];
  workerApplications: WorkerApplication[];
  sponsorAgreements: SponsorFundingAgreement[];
  supervisionRequests: SupervisionRequest[];
  supervisionAssignments: SupervisionAssignment[];
  supervisionReports: SupervisionReport[];
  workerPayments: WorkerPayment[];
  acceptanceFees: AcceptanceFeeRecord[];
  disputes: DisputeRecord[];
  adminAuditLogs: AdminAuditLog[];
  onReviewSponsorAgreement: (agreement: SponsorFundingAgreement) => void;
  onVerifyUser: (
    targetUserId: string,
    status: ProfileVerificationStatus,
    reviewerNotes?: string
  ) => Promise<void>;
  onResolveDispute: (disputeId: string, resolutionNotes: string) => Promise<void>;
  onSignOut: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  activeTab,
  onSelectTab,
  users,
  workerProfiles,
  farmerProfiles,
  supervisorProfiles,
  sponsorProfiles,
  organisations,
  verificationApplications,
  supportRequests,
  sponsorOffers,
  workerRequests,
  workerApplications,
  sponsorAgreements,
  supervisionRequests,
  supervisionAssignments,
  supervisionReports,
  workerPayments,
  acceptanceFees,
  disputes,
  adminAuditLogs,
  onReviewSponsorAgreement,
  onVerifyUser,
  onResolveDispute,
  onSignOut,
}) => {
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [adminStatusMsg, setAdminStatusMsg] = useState<string | null>(null);

  const [stellarWallets, setStellarWallets] = useState<UserWallet[]>([]);
  const [stellarTxs, setStellarTxs] = useState<WalletTransaction[]>([]);
  const [supportEscrows, setSupportEscrows] = useState<SupportFundingAgreementRecord[]>([]);
  const [workerEscrows, setWorkerEscrows] = useState<WorkerPaymentAgreementRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<WalletAuditLog[]>([]);
  const [loadingStellar, setLoadingStellar] = useState<boolean>(false);

  const loadStellarAdminOverview = async () => {
    setLoadingStellar(true);
    try {
      const res = await fetch('/api/stellar/admin/overview');
      if (res.ok) {
        const data = (await res.json()) as {
          wallets: UserWallet[];
          transactions: WalletTransaction[];
          supportEscrows: SupportFundingAgreementRecord[];
          workerEscrows: WorkerPaymentAgreementRecord[];
          auditLogs: WalletAuditLog[];
        };
        setStellarWallets(data.wallets || []);
        setStellarTxs(data.transactions || []);
        setSupportEscrows(data.supportEscrows || []);
        setWorkerEscrows(data.workerEscrows || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch {
      // Non-fatal if offline
    } finally {
      setLoadingStellar(false);
    }
  };

  useEffect(() => {
    void loadStellarAdminOverview();
  }, [activeTab]);

  const metrics = computeSeparatedPlatformMetrics({
    supportRequests,
    sponsorAgreements,
    workerRequests,
    workerPayments,
  });

  const pendingVerificationCount = users.filter(
    (u) => u.role !== 'Admin' && u.verificationStatus === 'Pending Verification'
  ).length;

  const handleVerificationDecision = async (
    targetUserId: string,
    status: ProfileVerificationStatus
  ) => {
    setBusyUserId(targetUserId);
    setAdminStatusMsg(null);
    try {
      await onVerifyUser(targetUserId, status, verificationNotes[targetUserId]);
      setAdminStatusMsg(`Updated account verification status to "${status}".`);
    } finally {
      setBusyUserId(null);
    }
  };

  const filteredDirectoryUsers = users.filter((u) => {
    if (u.role === 'Admin') return false;
    if (roleFilter === 'All') return true;
    return u.role === roleFilter;
  });

  return (
    <div className="min-h-screen bg-[#F5F8F3] text-[#243629]">
      {/* Top Restricted Admin Bar */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl font-bold tracking-tight text-[#116B32]">
              FarmFund
            </span>
            <span className="rounded-lg bg-[#116B32] px-2.5 py-1 text-[11px] font-bold text-white">
              Role: Admin Console
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-semibold text-[#718071] sm:inline">
              {adminUser.fullName}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#243629] hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5 text-[#718071]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Strictly Separated Admin Accounting Banner + Verification & Stellar Summary */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#116B32]">
                Verification &amp; Multi-Role Directory
              </span>
              <Users className="h-4 w-4 text-[#159B42]" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#718071]">Pending Review</p>
                <p className="mt-0.5 font-mono text-xl font-bold text-amber-800 tabular-nums">
                  {pendingVerificationCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#718071]">Total Accounts</p>
                <p className="mt-0.5 font-mono text-xl font-bold text-[#243629] tabular-nums">
                  {users.filter((u) => u.role !== 'Admin').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#718071]">Supervisors</p>
                <p className="mt-0.5 font-mono text-xl font-bold text-[#116B32] tabular-nums">
                  {supervisorProfiles.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#116B32]">
                Support Agreements vs. Direct Worker Ledger
              </span>
              <Scale className="h-4 w-4 text-[#159B42]" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#718071]">Support Reqs</p>
                <p className="mt-0.5 font-mono text-xl font-bold text-[#243629] tabular-nums">
                  {metrics.sponsorSystem.totalSupportRequests}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#718071]">Active Support</p>
                <p className="mt-0.5 font-mono text-xl font-bold text-[#116B32] tabular-nums">
                  {metrics.sponsorSystem.activeSponsorAgreementsCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#718071]">Wages Paid (0% Cut)</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-[#243629] tabular-nums">
                  ₦{metrics.workerSystem.confirmedWorkerWagesPaidNaira.toLocaleString('en-NG')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-900/15 bg-[#EAF6EC] p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#116B32]">
                Stellar Testnet Wallets &amp; Escrows (Read-Only)
              </span>
              <Wallet className="h-4 w-4 text-[#159B42]" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#718071]">Wallets</p>
                <p className="mt-0.5 font-mono text-xl font-bold text-[#243629] tabular-nums">
                  {stellarWallets.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#718071]">Verified Txs</p>
                <p className="mt-0.5 font-mono text-xl font-bold text-[#116B32] tabular-nums">
                  {stellarTxs.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#718071]">Active Escrows</p>
                <p className="mt-0.5 font-mono text-xl font-bold text-[#243629] tabular-nums">
                  {supportEscrows.length + workerEscrows.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Oversight Navigation */}
        <nav
          aria-label="Admin Dashboard Sections"
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5"
        >
          {(
            [
              'Verification & Users',
              'Role Profiles',
              'Farm Support & Offers',
              'Worker Jobs & Applications',
              'Support Agreements',
              'Supervision Oversight',
              'Worker Payment Records',
              'Disputes & Audit Logs',
              'Stellar Wallets & Escrows',
            ] as AdminTab[]
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab
                  ? 'bg-[#159B42] text-white shadow-xs'
                  : 'text-[#718071] hover:bg-[#F5F8F3] hover:text-[#243629]'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {adminStatusMsg && (
          <div className="rounded-xl border border-[#159B42]/25 bg-[#EAF6EC] px-4 py-3 text-xs font-semibold text-[#116B32]">
            {adminStatusMsg}
          </div>
        )}

        {/* 1. VERIFICATION QUEUE & USERS */}
        {activeTab === 'Verification & Users' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#243629]">
                  Identity Verification Queue &amp; User Accounts
                </h2>
                <p className="text-xs text-[#718071]">
                  Every newly registered Worker, Farmer, Supervisor, or Sponsor remains Pending
                  Verification until approved here by an authorised Admin.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Worker', 'Farmer', 'Supervisor', 'Sponsor'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      roleFilter === r
                        ? 'bg-[#159B42] text-white'
                        : 'border border-slate-200 text-[#718071]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {filteredDirectoryUsers.length === 0 ? (
              <p className="mt-5 rounded-xl bg-[#F5F8F3] p-4 text-xs text-[#718071]">
                No registered public user accounts match this filter yet.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {filteredDirectoryUsers.map((u) => {
                  const verApp = verificationApplications.find((v) => v.userId === u.id);
                  return (
                    <div
                      key={u.id}
                      className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-[#159B42]/30"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[#243629]">{u.fullName}</span>
                            <span className="rounded-md bg-[#F5F8F3] px-2 py-0.5 text-[11px] font-bold text-[#116B32]">
                              {u.role}
                              {u.sponsorType ? ` (${u.sponsorType})` : ''}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                u.verificationStatus === 'Verified'
                                  ? 'bg-[#EAF6EC] text-[#116B32]'
                                  : u.verificationStatus === 'Rejected'
                                    ? 'bg-red-100 text-red-900'
                                    : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {u.verificationStatus}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#718071]">
                            {u.email} · {u.phone} · {u.townOrLocation}, {u.state}, {u.country}
                          </p>
                          <p className="mt-1 text-xs text-[#243629]">
                            <strong>Government ID Ref:</strong> {u.governmentIdDocument || 'None'}
                            {verApp?.supportingDocuments?.length
                              ? ` · Supporting Docs: ${verApp.supportingDocuments.join(', ')}`
                              : ''}
                          </p>
                          {u.verificationNotes && (
                            <p className="mt-1 text-xs text-amber-900">
                              <strong>Last Review Note:</strong> {u.verificationNotes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={busyUserId === u.id || u.verificationStatus === 'Verified'}
                            onClick={() => void handleVerificationDecision(u.id, 'Verified')}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                              u.verificationStatus === 'Verified'
                                ? 'cursor-default border border-emerald-200 bg-[#EAF6EC] text-[#116B32]'
                                : 'bg-[#159B42] text-white hover:bg-[#116B32] disabled:opacity-50'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>
                              {u.verificationStatus === 'Verified' ? 'Verified ✓' : 'Verify'}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={busyUserId === u.id}
                            onClick={() =>
                              void handleVerificationDecision(u.id, 'More Information Required')
                            }
                            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
                          >
                            More Info Required
                          </button>
                          <button
                            type="button"
                            disabled={busyUserId === u.id}
                            onClick={() => void handleVerificationDecision(u.id, 'Rejected')}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-900 hover:bg-red-100"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <input
                          type="text"
                          value={verificationNotes[u.id] || ''}
                          onChange={(e) =>
                            setVerificationNotes((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                          placeholder="Optional verification review note for user..."
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-[#159B42] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. ROLE PROFILES DIRECTORY */}
        {activeTab === 'Role Profiles' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-[#243629]">
                Workers ({workerProfiles.length})
              </h3>
              <div className="mt-3 space-y-2 text-xs">
                {workerProfiles.length === 0 ? (
                  <p className="text-[#718071]">No registered workers yet.</p>
                ) : (
                  workerProfiles.map((w) => (
                    <div key={w.id} className="rounded-lg bg-[#F5F8F3] p-3">
                      <p className="font-bold text-[#243629]">
                        {w.fullName} · {w.verificationStatus}
                      </p>
                      <p className="text-[#718071]">
                        {w.location} · Skills: {w.skills.join(', ')} · ₦
                        {w.expectedWageNaira.toLocaleString('en-NG')} ({w.wageUnit})
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-[#243629]">
                Farmers ({farmerProfiles.length})
              </h3>
              <div className="mt-3 space-y-2 text-xs">
                {farmerProfiles.length === 0 ? (
                  <p className="text-[#718071]">No registered farmers yet.</p>
                ) : (
                  farmerProfiles.map((f) => (
                    <div key={f.id} className="rounded-lg bg-[#F5F8F3] p-3">
                      <p className="font-bold text-[#243629]">
                        {f.fullName} ({f.farmName}) · {f.verificationStatus}
                      </p>
                      <p className="text-[#718071]">
                        {f.farmLocation} · {f.farmingType} · {f.cropsOrLivestock} ({f.farmSize})
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-[#243629]">
                Supervisors ({supervisorProfiles.length})
              </h3>
              <div className="mt-3 space-y-2 text-xs">
                {supervisorProfiles.length === 0 ? (
                  <p className="text-[#718071]">No registered supervisors yet.</p>
                ) : (
                  supervisorProfiles.map((s) => (
                    <div key={s.id} className="rounded-lg bg-[#F5F8F3] p-3">
                      <p className="font-bold text-[#243629]">
                        {s.fullName} · {s.verificationStatus}
                      </p>
                      <p className="text-[#718071]">
                        {s.professionalQualifications} · Service: {s.availabilityAndServiceLocations}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-[#243629]">
                Sponsors ({sponsorProfiles.length}) &amp; Organisations ({organisations.length})
              </h3>
              <div className="mt-3 space-y-2 text-xs">
                {sponsorProfiles.length === 0 ? (
                  <p className="text-[#718071]">No registered sponsors yet.</p>
                ) : (
                  sponsorProfiles.map((sp) => (
                    <div key={sp.id} className="rounded-lg bg-[#F5F8F3] p-3">
                      <p className="font-bold text-[#243629]">
                        {sp.fullName} ({sp.sponsorType}) · {sp.verificationStatus}
                      </p>
                      <p className="text-[#718071]">
                        {sp.location} · Support: {sp.supportTypesProvided.join(', ')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. FARM SUPPORT REQUESTS & SPONSOR OFFERS */}
        {activeTab === 'Farm Support & Offers' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-[#243629]">
                Farmer Support Requests ({supportRequests.length})
              </h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[#718071]">
                      <th className="py-2.5 pr-4">Title</th>
                      <th className="py-2.5 px-4">Farmer &amp; Farm</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">Amount (₦)</th>
                      <th className="py-2.5 px-4">Arrangement</th>
                      <th className="py-2.5 pl-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supportRequests.map((req) => (
                      <tr key={req.id}>
                        <td className="py-3 pr-4 font-semibold text-[#243629]">{req.title}</td>
                        <td className="py-3 px-4 text-[#718071]">
                          {req.farmerName} · {req.farmName}
                        </td>
                        <td className="py-3 px-4 text-[#718071]">{req.assistanceType}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          ₦{req.fundingAmount.toLocaleString('en-NG')}
                        </td>
                        <td className="py-3 px-4 text-[#116B32]">{req.preferredShareModel}</td>
                        <td className="py-3 pl-4 font-semibold">{req.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-[#243629]">
                Direct Sponsor Offers ({sponsorOffers.length})
              </h3>
              <div className="mt-4 space-y-2 text-xs">
                {sponsorOffers.length === 0 ? (
                  <p className="text-[#718071]">No sponsor offers recorded yet.</p>
                ) : (
                  sponsorOffers.map((o) => (
                    <div key={o.id} className="rounded-xl border border-slate-200 p-3.5">
                      <p className="font-bold text-[#243629]">
                        {o.title} · {o.sponsorName} → {o.farmerName}
                      </p>
                      <p className="mt-1 text-[#718071]">
                        {o.fundingOrMaterialContribution} · {o.shareType} · Status: {o.status}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. WORKER JOBS & APPLICATIONS */}
        {activeTab === 'Worker Jobs & Applications' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-[#243629]">
                Published Farm Jobs ({workerRequests.length})
              </h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[#718071]">
                      <th className="py-2.5 pr-4">Job Title</th>
                      <th className="py-2.5 px-4">Publisher</th>
                      <th className="py-2.5 px-4">Category &amp; Location</th>
                      <th className="py-2.5 px-4 text-right">Hired / Needed</th>
                      <th className="py-2.5 px-4 text-right">Wage (₦)</th>
                      <th className="py-2.5 pl-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workerRequests.map((wreq) => (
                      <tr key={wreq.id}>
                        <td className="py-3 pr-4 font-semibold">{wreq.jobTitle}</td>
                        <td className="py-3 px-4 text-[#718071]">
                          {wreq.hirerName} ({wreq.hirerRole})
                        </td>
                        <td className="py-3 px-4 text-[#718071]">
                          {wreq.workCategory} · {wreq.location}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {wreq.workersHired} / {wreq.workersNeeded}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          ₦{wreq.paymentAmountNaira.toLocaleString('en-NG')}
                        </td>
                        <td className="py-3 pl-4 font-semibold text-[#116B32]">{wreq.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-[#243629]">
                Worker Job Applications ({workerApplications.length})
              </h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[#718071]">
                      <th className="py-2.5 pr-4">Worker</th>
                      <th className="py-2.5 px-4">Job Title</th>
                      <th className="py-2.5 px-4">Hirer</th>
                      <th className="py-2.5 px-4 text-right">Proposed Wage</th>
                      <th className="py-2.5 pl-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workerApplications.map((app) => (
                      <tr key={app.id}>
                        <td className="py-3 pr-4 font-semibold">{app.workerName}</td>
                        <td className="py-3 px-4 text-[#718071]">{app.jobTitle}</td>
                        <td className="py-3 px-4 text-[#718071]">
                          {app.hirerName} ({app.hirerRole})
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          ₦{app.proposedWageNaira.toLocaleString('en-NG')}
                        </td>
                        <td className="py-3 pl-4 font-semibold text-[#116B32]">{app.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. SUPPORT AGREEMENTS */}
        {activeTab === 'Support Agreements' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-[#243629]">
              Sponsor &amp; Farmer Support Agreements ({sponsorAgreements.length})
            </h3>
            <div className="mt-4 space-y-4">
              {sponsorAgreements.map((agr) => (
                <div
                  key={agr.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#718071]">
                      <span className="font-mono">{agr.id}</span>
                      <span>· Farmer: {agr.farmerName}</span>
                      <span>· Sponsor: {agr.sponsorName}</span>
                      <span>· Supervision: {agr.supervisionRequired ? 'Required' : 'Optional'}</span>
                    </div>
                    <h4 className="mt-1 text-base font-bold text-[#243629]">
                      {agr.requestTitle} — {agr.shareType}
                    </h4>
                    <p className="mt-1 text-xs text-[#718071]">
                      Contribution: {agr.sponsorContribution} · Status:{' '}
                      <strong className="text-[#116B32]">{agr.status}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onReviewSponsorAgreement(agr)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#159B42] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#116B32]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Inspect Agreement &amp; History</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. SUPERVISION OVERSIGHT */}
        {activeTab === 'Supervision Oversight' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-[#159B42]" />
                <h3 className="text-lg font-bold text-[#243629]">
                  Supervision Invitations &amp; Active Assignments
                </h3>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="text-xs font-bold uppercase text-[#718071]">
                    Invitations ({supervisionRequests.length})
                  </h4>
                  <div className="mt-2 space-y-2 text-xs">
                    {supervisionRequests.map((r) => (
                      <div key={r.id} className="rounded-xl bg-[#F5F8F3] p-3">
                        <p className="font-bold text-[#243629]">
                          {r.projectTitle} · {r.status}
                        </p>
                        <p className="text-[#718071]">
                          Invited Supervisor: {r.invitedSupervisorName} · Requested by:{' '}
                          {r.requestedByName} ({r.requestedByRole})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-[#718071]">
                    Active Assignments ({supervisionAssignments.length})
                  </h4>
                  <div className="mt-2 space-y-2 text-xs">
                    {supervisionAssignments.map((a) => (
                      <div key={a.id} className="rounded-xl bg-[#EAF6EC] p-3">
                        <p className="font-bold text-[#116B32]">
                          {a.projectTitle} · {a.status}
                        </p>
                        <p className="text-[#243629]">
                          Supervisor: {a.supervisorName} · Category: {a.agreementCategory}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-bold text-[#243629]">
                Submitted Supervision Reports ({supervisionReports.length})
              </h3>
              <div className="mt-3 space-y-2 text-xs">
                {supervisionReports.map((rep) => (
                  <div key={rep.id} className="rounded-xl border border-slate-200 p-3.5">
                    <div className="flex items-center justify-between font-bold text-[#243629]">
                      <span>
                        {rep.reportType}: {rep.summary}
                      </span>
                      <span className="text-[#718071]">
                        {rep.supervisorName} · {rep.createdAt.slice(0, 10)}
                      </span>
                    </div>
                    <p className="mt-1 text-[#718071]">{rep.observations}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7. WORKER PAYMENT RECORDS */}
        {activeTab === 'Worker Payment Records' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-[#243629]">
              Worker Wage Payment Records (0% Sponsor Share Deduction)
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[#718071]">
                    <th className="py-2.5 pr-4">Payment ID</th>
                    <th className="py-2.5 px-4">Worker</th>
                    <th className="py-2.5 px-4">Hirer &amp; Job</th>
                    <th className="py-2.5 px-4 text-right">Agreed Wage (₦)</th>
                    <th className="py-2.5 px-4 text-right">Sponsor Deduction</th>
                    <th className="py-2.5 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workerPayments.map((pay) => (
                    <tr key={pay.id}>
                      <td className="py-3 pr-4 font-mono text-[#718071]">{pay.id}</td>
                      <td className="py-3 px-4 font-semibold">{pay.workerName}</td>
                      <td className="py-3 px-4 text-[#718071]">
                        {pay.hirerName || pay.farmerName} · {pay.jobTitle}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        ₦{pay.amountNaira.toLocaleString('en-NG')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#116B32]">
                        ₦{pay.sponsorShareDeducted} (0%)
                      </td>
                      <td className="py-3 pl-4 font-semibold text-[#116B32]">{pay.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. DISPUTES & ADMIN AUDIT LOGS */}
        {activeTab === 'Disputes & Audit Logs' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-6">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-800" />
                <h3 className="text-lg font-bold text-[#243629]">
                  Acceptance Fee &amp; Anti-Absconding Escrow Bonds ({acceptanceFees.length})
                </h3>
              </div>
              {acceptanceFees.length === 0 ? (
                <p className="mt-2 text-xs text-[#718071]">
                  No Farmer or Worker Acceptance Fee commitment bonds recorded yet.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-amber-200 bg-white p-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[#718071]">
                        <th className="py-2 pr-3">Obligor</th>
                        <th className="py-2 px-3">Beneficiary</th>
                        <th className="py-2 px-3">Agreement</th>
                        <th className="py-2 px-3 text-right">Bond (USDC)</th>
                        <th className="py-2 pl-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {acceptanceFees.map((fee) => (
                        <tr key={fee.id}>
                          <td className="py-2 pr-3 font-semibold">
                            {fee.obligorName} ({fee.obligorRole})
                          </td>
                          <td className="py-2 px-3 text-[#718071]">{fee.beneficiaryName}</td>
                          <td className="py-2 px-3 text-[#718071]">{fee.agreementTitle}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#116B32]">
                            {fee.feeAmountUsdc.toFixed(2)} USDC
                          </td>
                          <td className="py-2 pl-3 font-mono font-bold">{fee.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-700" />
                <h3 className="text-lg font-bold text-[#243629]">
                  Disputes &amp; Mediation Centre ({disputes.length})
                </h3>
              </div>
              <div className="mt-4 space-y-4">
                {disputes.map((dsp) => (
                  <div key={dsp.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#718071]">
                      <span>
                        <strong className="text-[#243629]">{dsp.category}</strong> · Ref:{' '}
                        <span className="font-mono">{dsp.referenceId}</span> · Raised by:{' '}
                        {dsp.raisedByName}
                      </span>
                      <span className="font-semibold text-amber-800">{dsp.status}</span>
                    </div>
                    <h4 className="mt-1 text-base font-bold text-[#243629]">{dsp.title}</h4>
                    <p className="mt-1 text-xs text-[#718071]">{dsp.summary}</p>
                    {dsp.status !== 'Resolved' && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="text"
                          value={resolutionDrafts[dsp.id] || ''}
                          onChange={(e) =>
                            setResolutionDrafts((prev) => ({ ...prev, [dsp.id]: e.target.value }))
                          }
                          placeholder="Enter final mediation ruling..."
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void onResolveDispute(
                              dsp.id,
                              resolutionDrafts[dsp.id] ||
                                'Resolved by FarmFund Admin following verification.'
                            )
                          }
                          className="rounded-lg bg-[#159B42] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#116B32]"
                        >
                          Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-bold text-[#243629]">
                Platform Admin &amp; Verification Audit Logs ({adminAuditLogs.length})
              </h3>
              <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {adminAuditLogs.map((log) => (
                  <div key={log.id} className="flex flex-wrap items-center justify-between py-2.5">
                    <div>
                      <span className="font-mono font-bold text-[#116B32]">{log.action}</span>
                      <span className="ml-2 text-[#718071]">by {log.actorName}</span>
                      <p className="mt-0.5 text-[#243629]">{log.summary}</p>
                    </div>
                    <span className="font-mono text-[11px] text-[#718071]">
                      {log.createdAt.slice(0, 19)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 9. STELLAR WALLETS & ESCROWS MONITORING */}
        {activeTab === 'Stellar Wallets & Escrows' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-[#159B42]" />
                  <div>
                    <h3 className="text-lg font-bold text-[#243629]">
                      Stellar Testnet Wallet &amp; Soroban Escrow Monitoring
                    </h3>
                    <p className="text-xs text-[#718071]">
                      Read-only compliance &amp; ledger audit view. Private keys are never
                      accessible to Administrators.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadStellarAdminOverview()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#243629] hover:bg-[#F5F8F3]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingStellar ? 'animate-spin' : ''}`} />
                  <span>Refresh Ledger Data</span>
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[#718071]">
                      <th className="py-2 pr-3">User / Organisation</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Stellar Address</th>
                      <th className="py-2 px-3 text-right">USDC Balance</th>
                      <th className="py-2 px-3 text-right">XLM Balance</th>
                      <th className="py-2 pl-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stellarWallets.map((w) => (
                      <tr key={w.walletId}>
                        <td className="py-2.5 pr-3 font-semibold">{w.displayName || w.userId}</td>
                        <td className="py-2.5 px-3 text-[#718071]">{w.role}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <a
                            href={`https://stellar.expert/explorer/testnet/account/${w.walletAddress}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#159B42] hover:underline"
                          >
                            <span>
                              {w.walletAddress.slice(0, 10)}...{w.walletAddress.slice(-6)}
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {w.availableUsdcBalance || '0.00'} USDC
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#718071]">
                          {w.xlmBalance || '0.00'} XLM
                        </td>
                        <td className="py-2.5 pl-3">
                          <span className="rounded-md bg-[#EAF6EC] px-2 py-0.5 font-bold text-[#116B32]">
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h4 className="text-sm font-bold text-[#243629]">
                Immutable Wallet &amp; Escrow Security Audit Logs ({auditLogs.length})
              </h4>
              <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                {auditLogs.map((log) => (
                  <div key={log.logId} className="flex flex-wrap items-center justify-between py-2.5">
                    <div>
                      <span className="font-mono font-bold text-[#116B32]">{log.action}</span>
                      <span className="ml-2 text-[#718071]">Actor: {log.actorId}</span>
                      <p className="mt-0.5 text-[#243629]">{log.result}</p>
                    </div>
                    <span className="font-mono text-[11px] text-[#718071]">
                      {log.timestamp.slice(0, 19)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

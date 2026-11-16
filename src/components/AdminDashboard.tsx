import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  Scale,
  ShieldCheck,
  UserCheck,
  Wallet,
} from 'lucide-react';
import {
  DisputeRecord,
  SponsorFundingAgreement,
  SupportFundingAgreementRecord,
  SupportRequest,
  UserWallet,
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
  | 'Farm Support Requests'
  | 'Worker Requests'
  | 'Worker Accounts'
  | 'Users'
  | 'Support Agreements'
  | 'Worker Payment Records'
  | 'Disputes'
  | 'Stellar Wallets & Escrows';

interface AdminDashboardProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  supportRequests: SupportRequest[];
  workerRequests: WorkerRequest[];
  workerProfiles: WorkerProfile[];
  workerApplications: WorkerApplication[];
  sponsorAgreements: SponsorFundingAgreement[];
  workerPayments: WorkerPayment[];
  disputes: DisputeRecord[];
  onReviewSponsorAgreement: (agreement: SponsorFundingAgreement) => void;
  onToggleWorkerVerification: (workerProfileId: string) => void;
  onResolveDispute: (disputeId: string, resolutionNotes: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activeTab,
  onSelectTab,
  supportRequests,
  workerRequests,
  workerProfiles,
  workerApplications,
  sponsorAgreements,
  workerPayments,
  disputes,
  onReviewSponsorAgreement,
  onToggleWorkerVerification,
  onResolveDispute,
}) => {
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});
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

  return (
    <div className="space-y-6">
      {/* Strictly Separated Admin Accounting Banner + Stellar Monitoring Summary */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">
              Ledger A: Sponsor Farm Support System (30% Model)
            </span>
            <Scale className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Support Requests</p>
              <p className="mt-0.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {metrics.sponsorSystem.totalSupportRequests}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Active 30% Agreements</p>
              <p className="mt-0.5 font-mono text-xl font-bold text-emerald-800 tabular-nums">
                {metrics.sponsorSystem.activeSponsorAgreementsCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Committed Sponsor Value</p>
              <p className="mt-0.5 font-mono text-lg font-bold text-slate-900 tabular-nums">
                ₦{metrics.sponsorSystem.totalSponsorCommittedNaira.toLocaleString('en-NG')}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Ledger B: Farm Worker Labour System (0% Sponsor Share)
            </span>
            <UserCheck className="h-4 w-4 text-slate-700" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Open Worker Positions</p>
              <p className="mt-0.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {metrics.workerSystem.totalOpenWorkerPositions}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Confirmed Wages Paid</p>
              <p className="mt-0.5 font-mono text-lg font-bold text-emerald-800 tabular-nums">
                ₦{metrics.workerSystem.confirmedWorkerWagesPaidNaira.toLocaleString('en-NG')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Sponsor Deduction</p>
              <p className="mt-0.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
                0% (₦0)
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-900/15 bg-[#EAF6EC] p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#116B32]">
              Stellar Testnet Wallets &amp; Soroban Escrows
            </span>
            <Wallet className="h-4 w-4 text-[#159B42]" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-600">Provisioned Wallets</p>
              <p className="mt-0.5 font-mono text-xl font-bold text-[#142318] tabular-nums">
                {stellarWallets.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Verified On-Chain Txs</p>
              <p className="mt-0.5 font-mono text-xl font-bold text-[#116B32] tabular-nums">
                {stellarTxs.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Active Escrows</p>
              <p className="mt-0.5 font-mono text-xl font-bold text-[#142318] tabular-nums">
                {supportEscrows.length + workerEscrows.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation (Edit 4: Changed 'Job Applications' to 'Users' + Added 'Stellar Wallets & Escrows') */}
      <nav
        aria-label="Admin Dashboard Sections"
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5"
      >
        {(
          [
            'Farm Support Requests',
            'Worker Requests',
            'Worker Accounts',
            'Users',
            'Support Agreements',
            'Worker Payment Records',
            'Disputes',
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
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* 1. FARM SUPPORT REQUESTS */}
      {activeTab === 'Farm Support Requests' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">
            All Farm Support Requests (Sponsor System)
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4">Request Title</th>
                  <th className="py-2.5 px-4">Farmer &amp; Farm</th>
                  <th className="py-2.5 px-4">Location &amp; Size</th>
                  <th className="py-2.5 px-4 text-right">Funding Value (₦)</th>
                  <th className="py-2.5 px-4">30% Arrangement</th>
                  <th className="py-2.5 pl-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supportRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{req.title}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {req.farmerName} · {req.farmName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {req.location} ({req.farmSize})
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      ₦{req.fundingAmount.toLocaleString('en-NG')}
                    </td>
                    <td className="py-3 px-4 font-medium text-emerald-800">
                      {req.preferredShareModel}
                    </td>
                    <td className="py-3 pl-4 font-semibold text-slate-800">{req.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. WORKER REQUESTS */}
      {activeTab === 'Worker Requests' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">
            All Farm Worker Requests (Direct Labour System)
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4">Job Title</th>
                  <th className="py-2.5 px-4">Work Category</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4 text-right">Workers Hired/Needed</th>
                  <th className="py-2.5 px-4 text-right">Agreed Wage (₦)</th>
                  <th className="py-2.5 pl-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workerRequests.map((wreq) => (
                  <tr key={wreq.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{wreq.jobTitle}</td>
                    <td className="py-3 px-4 text-slate-700">{wreq.workCategory}</td>
                    <td className="py-3 px-4 text-slate-600">{wreq.location}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800 tabular-nums">
                      {wreq.workersHired} / {wreq.workersNeeded}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      ₦{wreq.paymentAmountNaira.toLocaleString('en-NG')} ({wreq.paymentBasis})
                    </td>
                    <td className="py-3 pl-4 font-semibold text-emerald-800">{wreq.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. WORKER ACCOUNTS */}
      {activeTab === 'Worker Accounts' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">
            Registered Farm Worker Accounts &amp; Verification
          </h3>
          <div className="mt-4 space-y-3">
            {workerProfiles.map((prof) => (
              <div
                key={prof.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-bold text-slate-900">{prof.fullName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{prof.location}</span>
                    <span aria-hidden="true">·</span>
                    <span>Privacy: {prof.contactVisibility}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700">
                    Skills: {prof.skills.join(', ')} · Expected Wage: ₦
                    {prof.expectedWageNaira.toLocaleString('en-NG')} ({prof.wageUnit})
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-emerald-800">
                    {prof.verificationStatus}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleWorkerVerification(prof.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {prof.verificationStatus === 'Verified'
                      ? 'Set Pending Review'
                      : 'Verify Worker Account'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. USERS (Edit 4: Changed from 'Job Applications' to 'Users') */}
      {activeTab === 'Users' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">
            Users &amp; Activity Directory
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4">User Name</th>
                  <th className="py-2.5 px-4">Assignment / Role</th>
                  <th className="py-2.5 px-4">Counterparty Farmer</th>
                  <th className="py-2.5 px-4 text-right">Agreed Value (₦)</th>
                  <th className="py-2.5 pl-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workerApplications.map((app) => (
                  <tr key={app.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{app.workerName}</td>
                    <td className="py-3 px-4 text-slate-700">{app.jobTitle}</td>
                    <td className="py-3 px-4 text-slate-600">{app.farmerName}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      ₦{app.proposedWageNaira.toLocaleString('en-NG')}
                    </td>
                    <td className="py-3 pl-4 font-semibold text-emerald-800">{app.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SUPPORT AGREEMENTS */}
      {activeTab === 'Support Agreements' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">
            Sponsor Funding Agreements (30% Produce / Farm-Funds Share Registry)
          </h3>
          <div className="mt-4 space-y-4">
            {sponsorAgreements.map((agr) => (
              <div
                key={agr.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{agr.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>Farmer: {agr.farmerName}</span>
                    <span aria-hidden="true">·</span>
                    <span>Sponsor: {agr.sponsorName}</span>
                  </div>
                  <h4 className="mt-1 text-base font-bold text-slate-900">
                    {agr.requestTitle} — {agr.shareType}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600">
                    Contribution: {agr.sponsorContribution} · Status:{' '}
                    <strong className="text-emerald-800">{agr.status}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onReviewSponsorAgreement(agr)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Inspect Agreement &amp; History</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. WORKER PAYMENT RECORDS */}
      {activeTab === 'Worker Payment Records' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">
            Worker Wage Payment Records (Strictly Separate from Sponsor Shares)
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Every worker payment record enforces 0% sponsor deduction and requires dual
            confirmation before being marked Confirmed Paid.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4">Payment ID</th>
                  <th className="py-2.5 px-4">Worker</th>
                  <th className="py-2.5 px-4">Farmer &amp; Job</th>
                  <th className="py-2.5 px-4 text-right">Agreed Wage (₦)</th>
                  <th className="py-2.5 px-4 text-right">Sponsor Deduction</th>
                  <th className="py-2.5 pl-4">Confirmation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workerPayments.map((pay) => (
                  <tr key={pay.id}>
                    <td className="py-3 pr-4 font-mono text-slate-600">{pay.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{pay.workerName}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {pay.farmerName} · {pay.jobTitle}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      ₦{pay.amountNaira.toLocaleString('en-NG')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800 tabular-nums">
                      ₦{pay.sponsorShareDeducted} (0%)
                    </td>
                    <td className="py-3 pl-4 font-semibold text-emerald-800">{pay.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. DISPUTES */}
      {activeTab === 'Disputes' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">
            Disputes &amp; Mediation Centre
          </h3>
          <div className="mt-4 space-y-4">
            {disputes.map((dsp) => (
              <div key={dsp.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    <strong className="text-slate-900">{dsp.category}</strong> · Ref:{' '}
                    <span className="font-mono">{dsp.referenceId}</span> · Raised by:{' '}
                    {dsp.raisedByName}
                  </span>
                  <span className="font-semibold text-amber-800">{dsp.status}</span>
                </div>
                <h4 className="mt-1 text-base font-bold text-slate-900">{dsp.title}</h4>
                <p className="mt-1 text-xs text-slate-700">{dsp.summary}</p>
                <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                  <strong>Resolution Notes:</strong> {dsp.resolutionNotes}
                </p>

                {dsp.status !== 'Resolved' && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={resolutionDrafts[dsp.id] || ''}
                      onChange={(e) =>
                        setResolutionDrafts((prev) => ({
                          ...prev,
                          [dsp.id]: e.target.value,
                        }))
                      }
                      placeholder="Enter final mediation ruling to resolve dispute..."
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onResolveDispute(
                          dsp.id,
                          resolutionDrafts[dsp.id] ||
                            'Resolved by FarmFund Admin following verification of signed records.'
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. STELLAR WALLETS & ESCROWS MONITORING (RESTRICTED ADMIN PERMISSIONS) */}
      {activeTab === 'Stellar Wallets & Escrows' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[#159B42]" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Stellar Testnet Wallet &amp; Soroban Escrow Monitoring
                  </h3>
                  <p className="text-xs text-slate-500">
                    Read-only compliance &amp; ledger audit view. Private keys are never accessible
                    to Administrators.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadStellarAdminOverview()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingStellar ? 'animate-spin' : ''}`} />
                <span>Refresh Ledger Data</span>
              </button>
            </div>

            <h4 className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Provisioned Embedded Wallets ({stellarWallets.length})
            </h4>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
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
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">
                        {w.displayName || w.userId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{w.role}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
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
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {w.availableUsdcBalance || '0.00'} USDC
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
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
            <h4 className="text-sm font-bold text-slate-900">
              Immutable Wallet &amp; Escrow Security Audit Logs ({auditLogs.length})
            </h4>
            <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
              {auditLogs.map((log) => (
                <div key={log.logId} className="flex flex-wrap items-center justify-between py-2.5">
                  <div>
                    <span className="font-mono font-bold text-[#116B32]">{log.action}</span>
                    <span className="ml-2 text-slate-600">Actor: {log.actorId}</span>
                    <p className="mt-0.5 text-slate-500">{log.result}</p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {log.timestamp.slice(0, 19)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

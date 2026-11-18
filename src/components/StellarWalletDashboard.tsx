import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import {
  ShareArrangementType,
  SponsorType,
  SupportFundingAgreementRecord,
  SupportRequest,
  UserRole,
  UserWallet,
  WalletActivationRecord,
  WalletTransaction,
  WorkerPaymentAgreementRecord,
  WorkerRequest,
} from '../types/farmfund';
import {
  calculateWorkerUsdcPaymentObligation,
  OFFICIAL_USDC_ISSUER_TESTNET,
  validateStellarPaymentDraft,
} from '../utils/farmfundLogic';

interface StellarWalletDashboardProps {
  userId: string;
  userName: string;
  role: UserRole;
  sponsorType?: SponsorType;
  supportRequests: SupportRequest[];
  workerRequests: WorkerRequest[];
}

export const StellarWalletDashboard: React.FC<StellarWalletDashboardProps> = ({
  userId,
  userName,
  role,
  sponsorType,
  supportRequests,
  workerRequests,
}) => {
  const isReadOnlyWalletRole = role === 'Admin' || role === 'Supervisor';
  const isOrgSponsor = role === 'Sponsor' && sponsorType === 'organisation';
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [officialUsdcIssuer, setOfficialUsdcIssuer] = useState<string>(
    OFFICIAL_USDC_ISSUER_TESTNET
  );
  const [sorobanContractId, setSorobanContractId] = useState<string>(
    'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75'
  );
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [supportEscrows, setSupportEscrows] = useState<SupportFundingAgreementRecord[]>([]);
  const [workerEscrows, setWorkerEscrows] = useState<WorkerPaymentAgreementRecord[]>([]);
  const [activations, setActivations] = useState<WalletActivationRecord[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [activating, setActivating] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [escrowBusy, setEscrowBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Active sub-panel inside the Wallet View
  const [activeSubTab, setActiveSubTab] = useState<
    'Overview & Send' | 'Receive & QR' | 'Soroban Escrows & Wages' | 'Transactions & Audit'
  >('Overview & Send');

  // Send Payment Form State
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [sendAmount, setSendAmount] = useState<string>('');
  const [sendAsset, setSendAsset] = useState<'USDC' | 'XLM'>('XLM');
  const [memoRef, setMemoRef] = useState<string>('FarmFund Payment');
  const [txFilter, setTxFilter] = useState<'ALL' | 'USDC' | 'XLM'>('ALL');

  // Worker Wage USDC Calculator State (5 Workers @ ₦10,000 example)
  const [calcWorkersCount, setCalcWorkersCount] = useState<number>(5);
  const [calcWagePerWorkerNaira, setCalcWagePerWorkerNaira] = useState<number>(10000);
  const [calcNgnPerUsdcRate, setCalcNgnPerUsdcRate] = useState<number>(1600);
  const [selectedWorkerReqId, setSelectedWorkerReqId] = useState<string>(
    workerRequests[0]?.id || 'wrk_req_1'
  );
  const [workerRecipientName, setWorkerRecipientName] = useState<string>('Musa Danjuma');

  // Sponsor 30% Support Escrow Form State
  const [selectedSupportReqId, setSelectedSupportReqId] = useState<string>(
    supportRequests[0]?.id || 'sup_req_1'
  );
  const [escrowContributionUsdc, setEscrowContributionUsdc] = useState<string>('950');
  const [escrowShareType, setEscrowShareType] = useState<ShareArrangementType>(
    '30% Farm Produce Share'
  );

  const wageCalculation = calculateWorkerUsdcPaymentObligation({
    workersCount: calcWorkersCount,
    wagePerWorkerNaira: calcWagePerWorkerNaira,
    approvedNgnPerUsdcRate: calcNgnPerUsdcRate,
  });

  const loadOrProvisionWallet = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const provRes = await fetch('/api/stellar/wallet/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role,
          sponsorType,
          displayName: userName,
          organisationName: isOrgSponsor ? userName : undefined,
        }),
      });
      if (!provRes.ok) {
        const errData = (await provRes.json()) as { error?: string };
        throw new Error(errData.error || 'Failed to provision embedded Stellar wallet.');
      }

      const detailRes = await fetch(`/api/stellar/wallet/${encodeURIComponent(userId)}`);
      if (!detailRes.ok) {
        throw new Error('Failed to load Stellar wallet state.');
      }
      const detail = (await detailRes.json()) as {
        wallet: UserWallet;
        officialUsdcIssuer: string;
        sorobanEscrowContractId: string;
        transactions: WalletTransaction[];
        supportEscrows: SupportFundingAgreementRecord[];
        workerEscrows: WorkerPaymentAgreementRecord[];
        activations: WalletActivationRecord[];
      };

      setWallet(detail.wallet);
      setOfficialUsdcIssuer(detail.officialUsdcIssuer);
      setSorobanContractId(detail.sorobanEscrowContractId);
      setTransactions(detail.transactions || []);
      setSupportEscrows(detail.supportEscrows || []);
      setWorkerEscrows(detail.workerEscrows || []);
      setActivations(detail.activations || []);

      if (detail.wallet?.walletAddress) {
        const qr = await QRCode.toDataURL(detail.wallet.walletAddress, {
          width: 220,
          margin: 1,
          color: {
            dark: '#116B32',
            light: '#FFFFFF',
          },
        });
        setQrDataUrl(qr);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to reach Stellar Wallet backend service.'
      );
    } finally {
      setLoading(false);
    }
  }, [userId, userName, role, sponsorType, isOrgSponsor]);

  useEffect(() => {
    void loadOrProvisionWallet();
  }, [loadOrProvisionWallet]);

  const handleCopyAddress = async () => {
    if (!wallet?.walletAddress) return;
    try {
      await navigator.clipboard.writeText(wallet.walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2500);
    } catch {
      setCopiedAddress(false);
    }
  };

  const handleActivateWallet = async () => {
    if (!wallet) return;
    setActivating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/stellar/wallet/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json()) as {
        error?: string;
        transactionHash?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Wallet activation failed on Stellar Testnet.');
      }
      setSuccessMsg(
        `Wallet activated on Stellar Testnet and official Circle USDC trustline established! On-chain Tx: ${data.transactionHash?.slice(0, 16)}...`
      );
      await loadOrProvisionWallet();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Wallet activation failed.');
    } finally {
      setActivating(false);
    }
  };

  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const numericAmount = Number(sendAmount);
    const availableBalance =
      sendAsset === 'USDC'
        ? Number(wallet.availableUsdcBalance || '0')
        : Math.max(0, Number(wallet.xlmBalance || '0') - 2.5);

    const validationErr = validateStellarPaymentDraft({
      senderAddress: wallet.walletAddress,
      recipientAddress: recipientAddress.trim(),
      assetCode: sendAsset,
      assetIssuer: sendAsset === 'USDC' ? officialUsdcIssuer : 'native',
      network: wallet.network,
      amount: numericAmount,
      availableBalance,
      senderActivated: wallet.status === 'Active',
      senderHasUsdcTrustline: Boolean(wallet.hasUsdcTrustline),
    });

    if (validationErr) {
      setErrorMsg(validationErr);
      return;
    }

    setSending(true);
    try {
      const idempotencyKey = `pay_${userId}_${Date.now()}`;
      const res = await fetch('/api/stellar/payment/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          recipientAddress: recipientAddress.trim(),
          amount: numericAmount,
          assetCode: sendAsset,
          memoReference: memoRef.trim() || 'FarmFund Payment',
          idempotencyKey,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        transaction?: WalletTransaction;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Payment rejected by Stellar Testnet.');
      }
      setSuccessMsg(
        `Verified on Stellar Testnet Horizon! Sent ${numericAmount.toFixed(2)} ${sendAsset} · Hash: ${data.transaction?.transactionHash.slice(0, 18)}...`
      );
      setSendAmount('');
      setRecipientAddress('');
      await loadOrProvisionWallet();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit Stellar transaction.');
    } finally {
      setSending(false);
    }
  };

  const handleFundSupportEscrow = async () => {
    const reqObj = supportRequests.find((r) => r.id === selectedSupportReqId) || supportRequests[0];
    if (!reqObj) return;
    setEscrowBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/stellar/escrow/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_AND_FUND',
          sponsorId: userId,
          sponsorName: userName,
          farmerId: reqObj.farmerId || 'demo_farmer_1',
          farmerName: reqObj.farmerName,
          requestId: reqObj.id,
          requestTitle: reqObj.title,
          contributionAmount: Number(escrowContributionUsdc) || 950,
          asset: 'USDC',
          shareType: escrowShareType,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        escrow?: SupportFundingAgreementRecord;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to lock Sponsor 30% Support Escrow.');
      }
      setSuccessMsg(
        `Soroban 30% Support Escrow funded (${data.escrow?.contributionAmount} USDC) under ${data.escrow?.shareType}. Strictly separated from worker wages.`
      );
      await loadOrProvisionWallet();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Escrow funding failed.');
    } finally {
      setEscrowBusy(false);
    }
  };

  const handleReleaseSupportEscrow = async (agreementId: string) => {
    setEscrowBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/stellar/escrow/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RELEASE_TO_FARMER',
          agreementId,
          sponsorId: userId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to release support escrow.');
      setSuccessMsg('Soroban Support Escrow milestone approved and released to Farmer wallet.');
      await loadOrProvisionWallet();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Release failed.');
    } finally {
      setEscrowBusy(false);
    }
  };

  const handleFundWorkerWageEscrow = async () => {
    const wReq = workerRequests.find((w) => w.id === selectedWorkerReqId) || workerRequests[0];
    setEscrowBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/stellar/escrow/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FUND_WORKER_ESCROW',
          farmerId: userId,
          farmerName: userName,
          workerId: 'worker_musa_1',
          workerName: workerRecipientName,
          workerRequestId: wReq?.id || 'wrk_req_1',
          jobTitle:
            wReq?.jobTitle ||
            `${calcWorkersCount} Workers @ ₦${calcWagePerWorkerNaira.toLocaleString('en-NG')}`,
          agreedWage: wageCalculation.totalObligationNaira,
          paymentAsset: 'USDC',
          paymentAmount: wageCalculation.totalObligationUsdc,
          conversionRateUsedNgnPerUsdc: calcNgnPerUsdcRate,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        workerEscrow?: WorkerPaymentAgreementRecord;
      };
      if (!res.ok) throw new Error(data.error || 'Failed to fund worker wage escrow.');
      setSuccessMsg(
        `Soroban Worker Wage Escrow funded (${data.workerEscrow?.paymentAmount} USDC for ₦${wageCalculation.totalObligationNaira.toLocaleString('en-NG')}) with 0% sponsor deduction.`
      );
      await loadOrProvisionWallet();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Worker escrow funding failed.');
    } finally {
      setEscrowBusy(false);
    }
  };

  const handleReleaseWorkerWageEscrow = async (agreementId: string) => {
    setEscrowBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/stellar/escrow/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RELEASE_WORKER_WAGE',
          agreementId,
          farmerId: userId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to release worker wage.');
      setSuccessMsg('100% of escrowed worker wage released to Farm Worker (0% sponsor deduction).');
      await loadOrProvisionWallet();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Worker wage release failed.');
    } finally {
      setEscrowBusy(false);
    }
  };

  const filteredTransactions = transactions.filter((t) =>
    txFilter === 'ALL' ? true : t.assetCode === txFilter
  );

  return (
    <section
      aria-label="FarmFund Embedded Stellar Wallet"
      className="rounded-3xl border border-emerald-900/15 bg-[#F5F8F3] p-5 shadow-xs sm:p-7"
    >
      {/* Top Wallet Identity & Network Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/10 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#159B42] text-white shadow-xs">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[#142318] sm:text-xl">
                FarmFund Embedded Stellar Wallet
              </h2>
              <span className="rounded-md bg-[#EAF6EC] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#116B32]">
                STELLAR {wallet?.network || 'TESTNET'}
              </span>
              <span
                className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold ${
                  wallet?.status === 'Active'
                    ? 'bg-emerald-100 text-emerald-900'
                    : wallet?.status === 'Restricted'
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {loading ? 'Syncing Ledger...' : wallet?.status || 'Activation Required'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Role: <strong className="text-[#142318]">{role}</strong> · Account:{' '}
              <strong className="text-[#142318]">{userName}</strong> ·{' '}
              {wallet?.custodyModel || 'Managed Embedded Custody (Zero External Wallet Required)'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {wallet?.status !== 'Active' && !isReadOnlyWalletRole && (
            <button
              type="button"
              disabled={activating || loading}
              onClick={() => void handleActivateWallet()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#159B42] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#116B32] disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {activating
                  ? 'Activating on Stellar Testnet...'
                  : 'Activate Wallet & Enable Circle USDC'}
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={() => void loadOrProvisionWallet()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Horizon</span>
          </button>
        </div>
      </div>

      {/* Unactivated Wallet Honest Notice */}
      {wallet && wallet.status !== 'Active' && !isReadOnlyWalletRole && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="font-bold">Your wallet has not been activated on Stellar Testnet yet</p>
              <p className="mt-0.5 text-amber-900">
                Stellar requires a minimum XLM base reserve (1 XLM base + 0.5 XLM per trustline) and
                an explicit Circle USDC trustline before your address can receive or send USDC. Click{' '}
                <strong>Activate Wallet &amp; Enable Circle USDC</strong> to fund your Testnet
                reserve and open your official USDC trustline on-chain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Alerts */}
      {errorMsg && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-900"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-[#EAF6EC] p-4 text-xs font-semibold text-[#116B32]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#159B42]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 4 Primary Wallet Balance & Reserve Cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-[#116B32]">Available Circle USDC</span>
            <span className="font-mono text-[10px] font-bold text-[#159B42]">
              {wallet?.hasUsdcTrustline ? 'TRUSTLINE ACTIVE' : 'NO TRUSTLINE'}
            </span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-[#142318] tabular-nums">
            {wallet?.availableUsdcBalance || '0.00'}{' '}
            <span className="text-sm font-semibold text-slate-500">USDC</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {Number(wallet?.availableUsdcBalance || '0') === 0
              ? 'No USDC balance available'
              : 'Verified on Stellar Horizon'}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Pending / Escrowed USDC</span>
            <Lock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-[#142318] tabular-nums">
            {wallet?.pendingEscrowUsdcBalance || '0.00'}{' '}
            <span className="text-sm font-semibold text-slate-500">USDC</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Locked in Soroban Support or Wage Escrow
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Stellar XLM Reserve &amp; Fees</span>
            <ShieldCheck className="h-3.5 w-3.5 text-[#159B42]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-[#142318] tabular-nums">
            {wallet?.xlmBalance || '0.00'}{' '}
            <span className="text-sm font-semibold text-slate-500">XLM</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Covers base reserve &amp; network fees
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Public Stellar Address</span>
            <button
              type="button"
              onClick={() => void handleCopyAddress()}
              className="inline-flex items-center gap-1 font-semibold text-[#159B42] hover:underline"
            >
              <Copy className="h-3 w-3" />
              <span>{copiedAddress ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <p
            title={wallet?.walletAddress || ''}
            className="mt-2 truncate font-mono text-xs font-bold text-[#142318]"
          >
            {wallet?.walletAddress || 'Provisioning...'}
          </p>
          <p className="mt-2 truncate font-mono text-[10px] text-slate-500">
            USDC Issuer: {officialUsdcIssuer.slice(0, 10)}...{officialUsdcIssuer.slice(-6)}
          </p>
        </div>
      </div>

      {/* Organisation Sponsor Multi-Representative Policy Banner */}
      {isOrgSponsor && wallet?.authorisedRepresentatives && (
        <div className="mt-4 rounded-2xl border border-emerald-900/15 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#116B32]" />
              <h3 className="text-xs font-bold text-slate-900">
                Organisation Wallet Governance · {wallet.organisationName || userName}
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-[#116B32]">
              {wallet.approvalPolicy}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {wallet.authorisedRepresentatives.map((rep) => (
              <div
                key={rep.repId}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">{rep.fullName}</p>
                  <p className="text-[11px] text-slate-500">
                    {rep.roleTitle} · {rep.email}
                  </p>
                </div>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  {rep.canApproveTransfers ? 'Authorised Signatory' : 'View Only'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="mt-5 flex flex-wrap items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white p-1.5">
        {(
          [
            'Overview & Send',
            ...(isReadOnlyWalletRole ? [] : (['Receive & QR'] as const)),
            'Soroban Escrows & Wages',
            'Transactions & Audit',
          ] as const
        ).map((tab) => {
          const displayLabel =
            isReadOnlyWalletRole && tab === 'Overview & Send'
              ? 'Overview (Read-Only)'
              : isReadOnlyWalletRole && tab === 'Soroban Escrows & Wages'
                ? 'Escrows & Wages (Read-Only)'
                : tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveSubTab(tab)}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                activeSubTab === tab
                  ? 'bg-[#159B42] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-[#EAF6EC] hover:text-[#116B32]'
              }`}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW, SEND PAYMENT & NGN RAMP COMPLIANCE */}
      {activeSubTab === 'Overview & Send' && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Send Stellar Payment Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-[#159B42]" />
                <h3 className="text-sm font-bold text-[#142318]">
                  Send Verified Stellar Payment (USDC or XLM)
                </h3>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                Horizon Verification Required
              </span>
            </div>

            {isReadOnlyWalletRole ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                {role} accounts have <strong>read-only monitoring permissions</strong> and cannot
                initiate commercial outbound wallet transfers, withdraw user funds, or unilaterally
                release escrow funds.
              </div>
            ) : (
              <form onSubmit={handleSendPayment} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="stellar-recipient"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Recipient Stellar Public Address (G...) *
                  </label>
                  <input
                    id="stellar-recipient"
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="G..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-xs text-slate-900 focus:border-[#159B42] focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="stellar-asset"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Asset *
                    </label>
                    <select
                      id="stellar-asset"
                      value={sendAsset}
                      onChange={(e) => setSendAsset(e.target.value as 'USDC' | 'XLM')}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-[#159B42] focus:outline-hidden"
                    >
                      <option value="USDC">Official Circle USDC</option>
                      <option value="XLM">Native XLM (Testnet)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="stellar-amount"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Amount ({sendAsset}) *
                    </label>
                    <input
                      id="stellar-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="10.00"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 focus:border-[#159B42] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="stellar-memo"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Payment Memo / Ref
                    </label>
                    <input
                      id="stellar-memo"
                      type="text"
                      maxLength={28}
                      value={memoRef}
                      onChange={(e) => setMemoRef(e.target.value)}
                      placeholder="FarmFund Reference"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#159B42] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">
                    Estimated Network Fee: <strong className="font-mono">0.00001 XLM</strong> (100
                    stroops)
                  </span>
                  <button
                    type="submit"
                    disabled={sending || wallet?.status !== 'Active'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#159B42] px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-[#116B32] disabled:opacity-50"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>
                      {sending
                        ? 'Signing & Verifying on Horizon...'
                        : `Send ${sendAsset} Payment`}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: NGN On/Off-Ramp Honest Status + Recovery & Security */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#142318]">
                  Nigerian Naira (NGN) Deposit &amp; Withdrawal
                </h3>
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                  Unavailable — Provider Not Configured
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Direct Nigerian bank account cash-in/cash-out (SEP-24 / SEP-6 licensed anchor) is{' '}
                <strong>Unavailable — Provider Not Configured</strong> in this Testnet environment.
                FarmFund never displays fake NGN bank transfers or simulated exchange settlements.
                Use direct Stellar USDC or XLM transfers via your public address or QR code.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-900/15 bg-[#EAF6EC] p-5">
              <h3 className="text-sm font-bold text-[#116B32]">
                Wallet Security, Custody &amp; Recovery
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-[#142318]">
                <li>
                  • <strong>No Plaintext Private Keys:</strong> Signing keys are encrypted with
                  AES-256-GCM inside the server custody vault and never exposed in browser storage.
                </li>
                <li>
                  • <strong>Official Circle USDC Validation:</strong> Only genuine{' '}
                  <code className="font-mono text-[11px]">USDC</code> issued by{' '}
                  <code className="font-mono text-[11px]">
                    {officialUsdcIssuer.slice(0, 8)}...{officialUsdcIssuer.slice(-6)}
                  </code>{' '}
                  is accepted.
                </li>
                <li>
                  • <strong>Account Recovery:</strong> Re-authenticating with your verified FarmFund
                  account restores access to your deterministic wallet identity.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECEIVE & QR CODE */}
      {activeSubTab === 'Receive & QR' && (
        <div className="mt-5 grid grid-cols-1 gap-6 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-12">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-900/10 bg-[#F5F8F3] p-6 md:col-span-5">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Stellar QR Code for ${wallet?.walletAddress}`}
                className="h-48 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-2xs"
              />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs text-slate-400">
                <QrCode className="h-8 w-8" />
              </div>
            )}
            <span className="mt-3 font-mono text-[11px] font-bold text-[#116B32]">
              SCAN TO SEND USDC OR XLM ({wallet?.network || 'TESTNET'})
            </span>
          </div>

          <div className="flex flex-col justify-center space-y-4 md:col-span-7">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#159B42]">
                Receive Stellar USDC or XLM
              </span>
              <h3 className="mt-1 text-lg font-bold text-[#142318]">
                Your Unique FarmFund Stellar Wallet Address
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Share this public address or QR code to receive official Circle USDC or native XLM
                on Stellar {wallet?.network || 'TESTNET'}. Never send non-Stellar tokens to this
                address.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="text-[11px] font-semibold text-slate-500">
                Stellar Public Key (Ed25519)
              </p>
              <p className="mt-1 break-all font-mono text-xs font-bold text-slate-900">
                {wallet?.walletAddress}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyAddress()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#159B42] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#116B32]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedAddress ? 'Address Copied!' : 'Copy Wallet Address'}</span>
                </button>
                {wallet?.walletAddress && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${wallet.walletAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <span>Inspect on Stellar.Expert</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SOROBAN ESCROWS & WORKER WAGES (STRICTLY SEPARATED) */}
      {activeSubTab === 'Soroban Escrows & Wages' && (
        <div className="mt-5 space-y-6">
          <div className="rounded-2xl border border-emerald-900/15 bg-white p-4 text-xs text-slate-700">
            <span className="font-bold text-[#116B32]">
              Soroban Escrow Contract ({sorobanContractId.slice(0, 10)}...
              {sorobanContractId.slice(-6)}):
            </span>{' '}
            Sponsor 30% Farm Support Escrows and Direct Farm Worker Wage Escrows (0% Sponsor
            Deduction) are strictly isolated on-chain and in accounting records.
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* System A: Sponsor-to-Farmer 30% Support Escrow */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#159B42]">
                Escrow Ledger A · 30% Sponsor Share Model
              </span>
              <h3 className="mt-1 text-base font-bold text-[#142318]">
                Sponsor-to-Farmer Support Escrow
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Lock USDC for an approved Farm Support Request under a 30% Farm Produce Share or 30%
                Farm Funds Share agreement.
              </p>

              <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Select Farmer Support Request
                  </label>
                  <select
                    value={selectedSupportReqId}
                    onChange={(e) => setSelectedSupportReqId(e.target.value)}
                    disabled={supportRequests.length === 0 || isReadOnlyWalletRole}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {supportRequests.length === 0 ? (
                      <option value="">No farm support requests available</option>
                    ) : (
                      supportRequests.map((req) => (
                        <option key={req.id} value={req.id}>
                          {req.title} ({req.farmerName} · ₦{req.fundingAmount.toLocaleString('en-NG')}
                          )
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Escrow Deposit (USDC)
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={isReadOnlyWalletRole}
                      value={escrowContributionUsdc}
                      onChange={(e) => setEscrowContributionUsdc(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Agreed Share Model
                    </label>
                    <select
                      value={escrowShareType}
                      disabled={isReadOnlyWalletRole}
                      onChange={(e) => setEscrowShareType(e.target.value as ShareArrangementType)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                    >
                      <option value="30% Farm Produce Share">30% Farm Produce Share</option>
                      <option value="30% Farm Funds Share">30% Farm Funds Share</option>
                    </select>
                  </div>
                </div>

                {!isReadOnlyWalletRole && (
                  <button
                    type="button"
                    disabled={escrowBusy || supportRequests.length === 0}
                    onClick={() => void handleFundSupportEscrow()}
                    className="w-full rounded-xl bg-[#159B42] py-2.5 text-xs font-bold text-white hover:bg-[#116B32] disabled:opacity-50"
                  >
                    Lock USDC in Soroban 30% Support Escrow
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2.5">
                {supportEscrows.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                    No Sponsor Support Escrows funded yet.
                  </p>
                ) : (
                  supportEscrows.map((esc) => (
                    <div
                      key={esc.agreementId}
                      className="rounded-xl border border-slate-200 p-3.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{esc.requestTitle}</span>
                        <span className="rounded-md bg-[#EAF6EC] px-2 py-0.5 font-bold text-[#116B32]">
                          {esc.status}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">
                        Amount:{' '}
                        <strong className="font-mono">
                          {esc.contributionAmount} {esc.asset}
                        </strong>{' '}
                        · {esc.shareType} ({esc.agreedSharePercentage}% Share)
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-[11px] text-slate-400">
                          Tx: {esc.transactionHash.slice(0, 16)}...
                        </span>
                        {esc.status === 'Funded in Escrow' && !isReadOnlyWalletRole && (
                          <button
                            type="button"
                            disabled={escrowBusy}
                            onClick={() => void handleReleaseSupportEscrow(esc.agreementId)}
                            className="rounded-lg bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                          >
                            Approve Milestone &amp; Release to Farmer
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System B: Farmer-to-Worker Direct Wage Escrow (0% Sponsor Share + 5 Workers @ ₦10,000 Calculator) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Escrow Ledger B · 100% Agreed Wage · 0% Sponsor Share
              </span>
              <h3 className="mt-1 text-base font-bold text-[#142318]">
                Farmer-to-Worker Direct Wage Escrow &amp; USDC Calculator
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Calculate and lock farm worker wages in USDC. Farm workers receive 100% of their
                agreed wages with <strong>0% sponsor share deduction</strong>.
              </p>

              <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Workers Hired
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={calcWorkersCount}
                      onChange={(e) => setCalcWorkersCount(Number(e.target.value) || 1)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Wage / Worker (₦)
                    </label>
                    <input
                      type="number"
                      min="500"
                      step="500"
                      value={calcWagePerWorkerNaira}
                      onChange={(e) => setCalcWagePerWorkerNaira(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Approved Rate (₦/USDC)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={calcNgnPerUsdcRate}
                      onChange={(e) => setCalcNgnPerUsdcRate(Number(e.target.value) || 1600)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-900/15 bg-[#EAF6EC] p-3 text-xs text-[#142318]">
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      Total Wage Obligation ({wageCalculation.workersCount} Workers @ ₦
                      {wageCalculation.wagePerWorkerNaira.toLocaleString('en-NG')}):
                    </span>
                    <span className="font-mono text-sm text-[#116B32]">
                      ₦{wageCalculation.totalObligationNaira.toLocaleString('en-NG')} (
                      {wageCalculation.totalObligationUsdc.toFixed(2)} USDC)
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-[#116B32]">
                    Per Worker: {wageCalculation.perWorkerUsdc.toFixed(2)} USDC · Sponsor Share
                    Deducted: 0% (₦0)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Worker Recipient
                    </label>
                    <input
                      type="text"
                      value={workerRecipientName}
                      onChange={(e) => setWorkerRecipientName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Field Job Reference
                    </label>
                    <select
                      value={selectedWorkerReqId}
                      disabled={workerRequests.length === 0 || isReadOnlyWalletRole}
                      onChange={(e) => setSelectedWorkerReqId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {workerRequests.length === 0 ? (
                        <option value="">No farm jobs published yet</option>
                      ) : (
                        workerRequests.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.jobTitle}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {!isReadOnlyWalletRole && (
                  <button
                    type="button"
                    disabled={escrowBusy || workerRequests.length === 0}
                    onClick={() => void handleFundWorkerWageEscrow()}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Fund Worker Wage Escrow ({wageCalculation.totalObligationUsdc.toFixed(2)} USDC ·
                    0% Sponsor Share)
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2.5">
                {workerEscrows.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                    No Worker Wage Escrows funded yet.
                  </p>
                ) : (
                  workerEscrows.map((wesc) => (
                    <div
                      key={wesc.agreementId}
                      className="rounded-xl border border-slate-200 p-3.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {wesc.workerName} · {wesc.jobTitle}
                        </span>
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-900">
                          {wesc.paymentStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">
                        Wage:{' '}
                        <strong className="font-mono">
                          ₦{wesc.agreedWage.toLocaleString('en-NG')} ({wesc.paymentAmount}{' '}
                          {wesc.paymentAsset})
                        </strong>{' '}
                        · Sponsor Deduction: <strong>0%</strong>
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-[11px] text-slate-400">
                          Tx: {wesc.transactionHash.slice(0, 16)}...
                        </span>
                        {wesc.paymentStatus === 'Escrow Funded' && !isReadOnlyWalletRole && (
                          <button
                            type="button"
                            disabled={escrowBusy}
                            onClick={() => void handleReleaseWorkerWageEscrow(wesc.agreementId)}
                            className="rounded-lg bg-[#159B42] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#116B32]"
                          >
                            Confirm Work &amp; Release 100% Wage
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VERIFIED STELLAR TRANSACTIONS & ACTIVATION AUDIT */}
      {activeSubTab === 'Transactions & Audit' && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#142318]">
                On-Chain Verified Transaction History (Stellar {wallet?.network || 'TESTNET'})
              </h3>
              <p className="text-xs text-slate-500">
                Only real transactions verified against Stellar Horizon are marked Verified.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {(['ALL', 'USDC', 'XLM'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTxFilter(f)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    txFilter === f
                      ? 'bg-[#159B42] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-slate-700">No transactions yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Activate your wallet on Stellar Testnet or receive USDC/XLM to see live on-chain
                ledger entries here.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-3">Type &amp; Reference</th>
                    <th className="py-2.5 px-3">Asset &amp; Amount</th>
                    <th className="py-2.5 px-3">Counterparty</th>
                    <th className="py-2.5 px-3">Transaction Hash</th>
                    <th className="py-2.5 pl-3">Horizon Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => {
                    const isIncoming = tx.recipientAddress === wallet?.walletAddress;
                    return (
                      <tr key={tx.transactionId}>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            {isIncoming ? (
                              <ArrowDownLeft className="h-3.5 w-3.5 text-[#159B42]" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5 text-slate-700" />
                            )}
                            <span>{tx.transactionType}</span>
                          </div>
                          {tx.memoReference && (
                            <span className="text-[11px] text-slate-500">
                              Memo: {tx.memoReference}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 tabular-nums">
                          {isIncoming ? '+' : '-'}
                          {tx.amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          {tx.assetCode}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {(isIncoming ? tx.senderAddress : tx.recipientAddress).slice(0, 8)}...
                          {(isIncoming ? tx.senderAddress : tx.recipientAddress).slice(-6)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <a
                            href={
                              tx.explorerUrl ||
                              `https://stellar.expert/explorer/testnet/tx/${tx.transactionHash}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#159B42] hover:underline"
                          >
                            <span>{tx.transactionHash.slice(0, 14)}...</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="py-3 pl-3">
                          <span className="rounded-md bg-[#EAF6EC] px-2 py-0.5 font-bold text-[#116B32]">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activations.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              Latest Activation Record: <strong>{activations[0].activationMethod}</strong> · Status:{' '}
              <strong className="text-[#116B32]">{activations[0].status}</strong> · Verified:{' '}
              <span className="font-mono">{activations[0].verifiedAt.slice(0, 19)}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

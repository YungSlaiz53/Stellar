import React from 'react';
import { CheckCircle2, FileCheck2, Scale, ShieldAlert, X } from 'lucide-react';
import { SponsorFundingAgreement, UserRole } from '../types/farmfund';
import { calculateSponsorThirtyPercentShare } from '../utils/farmfundLogic';

interface SponsorAgreementModalProps {
  agreement: SponsorFundingAgreement | null;
  activeRole: UserRole;
  onClose: () => void;
  onAcceptAgreement: (agreementId: string, party: 'Farmer' | 'Sponsor') => void;
}

export const SponsorAgreementModal: React.FC<SponsorAgreementModalProps> = ({
  agreement,
  activeRole,
  onClose,
  onAcceptAgreement,
}) => {
  if (!agreement) return null;

  const sampleBreakdown = calculateSponsorThirtyPercentShare({
    shareType: agreement.shareType,
    eligibleTotalAmount:
      agreement.shareType === '30% Farm Produce Share'
        ? 420
        : agreement.contributionValueNaira * 2.5,
    unitLabel: agreement.shareType === '30% Farm Produce Share' ? 'bags (100kg)' : 'NGN',
  });

  const isLocked =
    agreement.status === 'Active Agreement' || agreement.status === 'Completed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agreement-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-emerald-800">
              <span>Sponsor Support Agreement</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{agreement.id}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold">{agreement.status}</span>
            </div>
            <h2
              id="agreement-modal-title"
              className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl"
            >
              {agreement.requestTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close agreement review modal"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mandatory Pre-Acceptance 30% Notice */}
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50/90 p-4">
          <div className="flex items-start gap-3">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                IMPORTANT SPONSOR AGREEMENT — {agreement.shareType.toUpperCase()}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                By entering this support agreement through FarmFund, both parties confirm that the
                sponsor&apos;s agreed return is <strong>30% of the eligible farm produce or farm funds</strong>,
                as specified below. The 30% is never deducted upfront when a request is submitted, and
                does not apply to farm worker wages.
              </p>
              <p className="mt-2 font-mono text-xs font-medium text-amber-950">
                Illustrative Split: {sampleBreakdown.formattedSummary}
              </p>
            </div>
          </div>
        </div>

        {/* 8 Mandatory Pre-Acceptance Disclosure Items */}
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Mandatory Pre-Acceptance Agreement Terms
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">1. Sponsor&apos;s Contribution</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {agreement.sponsorContribution}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
                Valued at ₦{agreement.contributionValueNaira.toLocaleString('en-NG')}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                2. Agreed 30% Share &amp; 3. Produce vs. Funds Model
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-900">
                {agreement.sharePercentage}% Return — {agreement.shareType}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Farmer retains 70% of eligible output/proceeds; Sponsor receives 30%.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                4. How the 30% Share Will Be Calculated
              </p>
              <p className="mt-0.5 text-slate-800">{agreement.calculationMethod}</p>
            </div>
            <hr className="border-slate-100" />
            <div>
              <p className="text-xs font-semibold text-slate-500">
                5. When the Sponsor Is Entitled to Receive It
              </p>
              <p className="mt-0.5 text-slate-800">{agreement.entitlementTiming}</p>
            </div>
            <hr className="border-slate-100" />
            <div>
              <p className="text-xs font-semibold text-slate-500">
                6. How Produce or Funds Will Be Measured and Verified
              </p>
              <p className="mt-0.5 text-slate-800">{agreement.measurementVerification}</p>
            </div>
            <hr className="border-slate-100" />
            <div>
              <p className="text-xs font-semibold text-slate-500">
                7. What Happens if the Harvest Is Poor or the Farm Experiences Losses
              </p>
              <p className="mt-0.5 text-slate-800">{agreement.lossOrPoorHarvestClause}</p>
            </div>
            <hr className="border-slate-100" />
            <div>
              <p className="text-xs font-semibold text-slate-500">
                8. Additional Agreed Conditions
              </p>
              <p className="mt-0.5 text-slate-800">
                {agreement.additionalConditions || 'Standard FarmFund reporting schedule applies.'}
              </p>
            </div>
          </div>
        </div>

        {/* Risk & Nigerian Legal / Regulatory Disclosure */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
            <p className="text-xs leading-relaxed text-slate-600">
              <strong>Agricultural Risk &amp; Nigerian Regulatory Disclosure:</strong> FarmFund does
              not guarantee a harvest, profit, or capital repayment. Agricultural production is
              exposed to weather, pest, and market fluctuations. Commercial deployment of produce or
              farm-funds sharing agreements is subject to Nigerian legal and regulatory review
              (including SEC Nigeria / state agricultural contract statutes where applicable). Once
              accepted by both parties, these terms are locked and cannot be silently altered.
            </p>
          </div>
        </div>

        {/* Dual Party Acceptance Status & Audit Trail */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Farmer Acceptance</span>
              <span className="text-xs font-medium text-slate-700">{agreement.farmerName}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              {agreement.farmerAccepted ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Accepted ({agreement.farmerAcceptedAt.slice(0, 10)})
                </span>
              ) : (
                <span className="text-sm font-medium text-amber-700">Awaiting Farmer Review</span>
              )}
              {!agreement.farmerAccepted && !isLocked && (
                <button
                  type="button"
                  onClick={() => onAcceptAgreement(agreement.id, 'Farmer')}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
                >
                  Accept as Farmer
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Sponsor Acceptance</span>
              <span className="text-xs font-medium text-slate-700">{agreement.sponsorName}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              {agreement.sponsorAccepted ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Accepted ({agreement.sponsorAcceptedAt.slice(0, 10)})
                </span>
              ) : (
                <span className="text-sm font-medium text-amber-700">Awaiting Sponsor Review</span>
              )}
              {!agreement.sponsorAccepted && !isLocked && (
                <button
                  type="button"
                  onClick={() => onAcceptAgreement(agreement.id, 'Sponsor')}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
                >
                  Accept as Sponsor
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Immutable Agreement History Log */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <FileCheck2 className="h-4 w-4 text-emerald-700" />
            <span>Immutable Agreement Audit History (Active Role: {activeRole})</span>
          </div>
          <ul className="mt-2 space-y-1.5 font-mono text-xs text-slate-600">
            {agreement.historyLog.map((entry, idx) => (
              <li key={idx}>• {entry}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Close Agreement View
          </button>
        </div>
      </div>
    </div>
  );
};

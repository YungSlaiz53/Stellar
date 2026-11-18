import React from 'react';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import type { ProfileVerificationStatus, UserRole } from '../types/farmfund';

interface VerificationBannerProps {
  role: UserRole;
  status: ProfileVerificationStatus;
  notes?: string;
  onOpenProfile?: () => void;
}

export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  role,
  status,
  notes,
  onOpenProfile,
}) => {
  const styles =
    status === 'Verified'
      ? 'border-emerald-900/15 bg-[#EAF6EC] text-[#116B32]'
      : status === 'Rejected'
        ? 'border-red-200 bg-red-50 text-red-900'
        : status === 'More Information Required'
          ? 'border-amber-300 bg-amber-50 text-amber-950'
          : 'border-amber-200 bg-[#FFFDF2] text-[#243629]';

  const Icon =
    status === 'Verified'
      ? CheckCircle2
      : status === 'Rejected'
        ? ShieldAlert
        : status === 'More Information Required'
          ? AlertCircle
          : Clock;

  const description =
    status === 'Verified'
      ? `Your ${role} profile and submitted identity documentation have been reviewed and approved by an authorised FarmFund verification reviewer.`
      : status === 'Rejected'
        ? `Your verification submission was declined. ${notes || 'Review your profile details and re-submit valid identification.'}`
        : status === 'More Information Required'
          ? `Additional details or clearer documentation were requested by the verification reviewer. ${notes || ''}`
          : `Your ${role} profile is currently awaiting verification by an authorised reviewer. Uploaded IDs remain Pending Verification until formally approved.`;

  return (
    <div
      role="status"
      aria-label="Account Verification Status"
      className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${styles}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span>Verification Status:</span>
            <span className="font-mono uppercase">{status}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{description}</p>
        </div>
      </div>

      {status !== 'Verified' && onOpenProfile && (
        <button
          type="button"
          onClick={onOpenProfile}
          className="rounded-xl border border-current/20 bg-white px-3.5 py-1.5 text-xs font-bold transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          Review Profile &amp; ID
        </button>
      )}
    </div>
  );
};

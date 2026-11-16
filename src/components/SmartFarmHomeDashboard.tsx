import React from 'react';
import {
  Bell,
  BookOpen,
  ChevronRight,
  Clock,
  Compass,
  Droplets,
  Headphones,
  LayoutGrid,
  Maximize2,
  Play,
  Ruler,
  Sprout,
} from 'lucide-react';
import {
  SponsorFundingAgreement,
  SupportRequest,
  UserRole,
  WorkerPayment,
  WorkerRequest,
} from '../types/farmfund';
import { computeSeparatedPlatformMetrics } from '../utils/farmfundLogic';
import { ASSETS } from '../data/seedData';
import { FarmerTab } from './FarmerRequestSystem';
import { WorkerTab } from './WorkerMarketplaceAndDashboard';

interface SmartFarmHomeDashboardProps {
  activeRole: UserRole;
  userName: string;
  supportRequests: SupportRequest[];
  sponsorAgreements: SponsorFundingAgreement[];
  workerRequests: WorkerRequest[];
  workerPayments: WorkerPayment[];
  onOpenFarmerRequestTab: (tab: FarmerTab) => void;
  onOpenWorkerTab: (tab: WorkerTab) => void;
  onNavigateRole: (role: UserRole) => void;
  onReviewSponsorAgreement: (agr: SponsorFundingAgreement) => void;
}

export const SmartFarmHomeDashboard: React.FC<SmartFarmHomeDashboardProps> = ({
  supportRequests,
  sponsorAgreements,
  workerRequests,
  workerPayments,
  onOpenFarmerRequestTab,
  onOpenWorkerTab,
  onNavigateRole,
  onReviewSponsorAgreement,
}) => {
  const metrics = computeSeparatedPlatformMetrics({
    supportRequests,
    sponsorAgreements,
    workerRequests,
    workerPayments,
  });

  const totalHectares = (16.5 + (supportRequests.length - 2) * 5).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Unified Farmer & Worker SmartFarm Dashboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left / Primary SmartFarm Mobile-Style Column */}
        <div className="space-y-5 rounded-3xl border border-slate-200/80 bg-gradient-to-b from-sky-200/75 via-sky-50/60 to-slate-50 p-5 shadow-xs sm:p-6 lg:col-span-5">
          {/* Top Bar: Notification / Scan Icons + Sun & Cloud Illustration (Edit 2: Removed Iseyin Sky Farm & 32°C Clear Wind speed block) */}
          <div className="flex items-start justify-end">
            <div className="flex flex-col items-end gap-3">
              {/* Top-right circular icons matching reference image */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenWorkerTab('Messages')}
                  aria-label="Open direct messages"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-xs transition-transform hover:scale-105"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenFarmerRequestTab('My Agreements')}
                  aria-label="Inspect support agreements"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-xs transition-transform hover:scale-105"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>

              {/* Sun & Cloud Weather Illustration */}
              <div className="relative mt-1 h-14 w-20" aria-hidden="true">
                <div className="absolute top-0 right-1 h-10 w-10 rounded-full bg-amber-400 shadow-xs" />
                <div className="absolute bottom-0 left-0 h-9 w-16 rounded-full bg-white shadow-xs" />
                <div className="absolute bottom-1 left-3 h-10 w-10 rounded-full bg-white" />
              </div>
            </div>
          </div>

          {/* 4-Column Quick Action Cards (Plan, Workers, Academy, Support) */}
          <div className="grid grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => onOpenFarmerRequestTab('Request Farm Support')}
              className="flex flex-col items-center justify-center rounded-2xl bg-white px-2 py-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <span className="mt-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                Plan
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenWorkerTab('Find Farm Jobs')}
              className="flex flex-col items-center justify-center rounded-2xl bg-white px-2 py-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Ruler className="h-5 w-5" />
              </div>
              <span className="mt-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                Workers
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenFarmerRequestTab('My Agreements')}
              className="flex flex-col items-center justify-center rounded-2xl bg-white px-2 py-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="mt-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                Academy
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenWorkerTab('Messages')}
              className="flex flex-col items-center justify-center rounded-2xl bg-white px-2 py-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Headphones className="h-5 w-5" />
              </div>
              <span className="mt-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                Support
              </span>
            </button>
          </div>

          {/* Horizontal Web Banner Card */}
          <button
            type="button"
            onClick={() => onOpenFarmerRequestTab('Request Farm Support')}
            className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl bg-stone-700 p-5 text-left text-white shadow-xs transition-all hover:shadow-md"
          >
            <img
              src={ASSETS.supportProject}
              alt="FarmFund SmartFarm Web Portal"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-900/85 via-stone-900/55 to-transparent" />
            <div className="relative z-10">
              <p className="text-lg font-bold italic tracking-tight text-white">
                FarmFund SmartFarm Web
              </p>
              <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-stone-100">
                <span>Open Support Request Centre</span>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-stone-900">
                  <ChevronRight className="h-3 w-3" />
                </span>
              </span>
            </div>
          </button>

          {/* Data Summary Card */}
          <div className="rounded-2xl bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-600">Data Summary</span>
              <button
                type="button"
                onClick={() => onOpenFarmerRequestTab('My Support Requests')}
                className="inline-flex items-center gap-1 font-mono text-slate-400 hover:text-slate-700"
              >
                <span>2026/11/16</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
                {totalHectares}
              </span>
              <span className="text-sm font-semibold text-slate-700">ha</span>
              <span className="ml-2 text-xs text-slate-400">
                ({metrics.sponsorSystem.totalSupportRequests} Support Projects ·{' '}
                {metrics.workerSystem.totalWorkerRequests} Field Jobs)
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-4 border-t border-slate-100 pt-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                  <Clock className="h-3 w-3" />
                </span>
                <span className="font-mono font-medium text-slate-700 tabular-nums">
                  ₦{(metrics.sponsorSystem.totalSponsorCommittedNaira / 1000000).toFixed(2)}M (30%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
                  <Droplets className="h-3 w-3" />
                </span>
                <span className="font-mono font-medium text-slate-700 tabular-nums">
                  {metrics.sponsorSystem.activeSponsorAgreementsCount} Active Share
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Sprout className="h-3 w-3" />
                </span>
                <span className="font-mono font-medium text-slate-700 tabular-nums">
                  ₦{metrics.workerSystem.confirmedWorkerWagesPaidNaira.toLocaleString('en-NG')} Wage
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white">
                  <Compass className="h-3 w-3" />
                </span>
                <span className="font-mono font-medium text-slate-700 tabular-nums">
                  {metrics.workerSystem.totalOpenWorkerPositions} Worker Spots
                </span>
              </div>
            </div>
          </div>

          {/* Featured Content Section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Featured Content</h3>
              <button
                type="button"
                onClick={() => onOpenFarmerRequestTab('My Support Requests')}
                className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-700"
              >
                <span>View More</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Card 1 */}
              <button
                type="button"
                onClick={() => {
                  if (sponsorAgreements[0]) {
                    onReviewSponsorAgreement(sponsorAgreements[0]);
                  } else {
                    onOpenFarmerRequestTab('My Support Requests');
                  }
                }}
                className="group overflow-hidden rounded-2xl bg-white text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-28 w-full overflow-hidden">
                  <img
                    src={ASSETS.heroFarm}
                    alt="Maize & Cassava Support Case"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 flex flex-col justify-end">
                    <span className="text-[10px] text-slate-200">Assignment case</span>
                    <p className="text-sm font-bold leading-tight text-white">
                      30% Produce Share case
                    </p>
                  </div>
                  <span className="absolute right-2.5 bottom-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-900 shadow-xs">
                    <Play className="h-3 w-3 fill-slate-900" />
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-slate-700 line-clamp-2">
                    Dry-season maize support operation case
                  </p>
                </div>
              </button>

              {/* Card 2 */}
              <button
                type="button"
                onClick={() => onOpenWorkerTab('Find Farm Jobs')}
                className="group overflow-hidden rounded-2xl bg-white text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-28 w-full overflow-hidden">
                  <img
                    src={ASSETS.workersHarvest}
                    alt="Field Worker Harvest Operation Case"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 flex flex-col justify-end">
                    <span className="text-[10px] text-slate-200">Assignment case</span>
                    <p className="text-sm font-bold leading-tight text-white">
                      Iseyin Harvest case
                    </p>
                  </div>
                  <span className="absolute right-2.5 bottom-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-900 shadow-xs">
                    <Play className="h-3 w-3 fill-slate-900" />
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-slate-700 line-clamp-2">
                    Field worker wage operation case (0% share)
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column on Desktop: Support Requests & Farm Jobs Overview (Edit 1: Removed Unified Farmer & Worker Workspace header block) */}
        <div className="space-y-5 lg:col-span-7">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">
                    Farm Support Requests (30% Share)
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-600">
                    {supportRequests.length} Total
                  </span>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {supportRequests.slice(0, 2).map((req) => (
                    <li
                      key={req.id}
                      className="rounded-xl border border-slate-200/80 bg-white p-3 text-xs"
                    >
                      <p className="font-bold text-slate-900">{req.title}</p>
                      <p className="mt-0.5 text-slate-500">
                        {req.location} · {req.farmSize} ·{' '}
                        <strong className="text-emerald-700">{req.preferredShareModel}</strong>
                      </p>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onOpenFarmerRequestTab('Request Farm Support')}
                  className="mt-3 w-full rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  + Request Farm Support
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Available Farm Jobs &amp; Labour Offers
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-600">
                    {workerRequests.length} Open
                  </span>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {workerRequests.slice(0, 2).map((wreq) => (
                    <li
                      key={wreq.id}
                      className="rounded-xl border border-slate-200/80 bg-white p-3 text-xs"
                    >
                      <p className="font-bold text-slate-900">{wreq.jobTitle}</p>
                      <p className="mt-0.5 text-slate-500">
                        {wreq.location} · ₦{wreq.paymentAmountNaira.toLocaleString('en-NG')} (0%
                        Sponsor Share)
                      </p>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onOpenWorkerTab('Find Farm Jobs')}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Browse &amp; Apply for Farm Jobs
                </button>
              </div>
            </div>
          </div>

          {/* Distinct Workspace Switcher: Farmer & Worker Dashboard vs Sponsor Dashboard */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Switch Between Merged Farmer/Worker Dashboard &amp; Sponsor Dashboard
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Farmers and Farm Workers share this unified operational dashboard. Sponsors use a
              dedicated institutional dashboard to upload requests and accept farmer sponsorship
              requests.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onOpenFarmerRequestTab('Request Farm Support')}
                className="rounded-2xl border border-emerald-600 bg-emerald-50/50 p-4 text-left transition-all hover:bg-emerald-50"
              >
                <p className="text-xs font-bold text-emerald-950">
                  Farmer &amp; Worker Unified Dashboard (Active)
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  Request Farm Support (30% Share), apply for farm jobs (100% Wage), and reply to
                  individual messages.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigateRole('Sponsor')}
                className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 text-left transition-all hover:border-indigo-700 hover:bg-indigo-50"
              >
                <p className="text-xs font-bold text-indigo-950">
                  Switch to Dedicated Sponsor Dashboard →
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  Home, Upload Request, and Profile only — upload requests for workers/farmers and
                  accept 30% sponsorship requests.
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

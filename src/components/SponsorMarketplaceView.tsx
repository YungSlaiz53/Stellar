import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  Handshake,
  Home,
  PlusCircle,
  Scale,
  Sprout,
  Upload,
  UserCheck,
} from 'lucide-react';
import {
  FARM_WORK_CATEGORIES,
  SponsorFundingAgreement,
  SupportRequest,
  WorkerPaymentBasis,
  WorkerRequest,
} from '../types/farmfund';
import { ASSETS } from '../data/seedData';

export type SponsorTab = 'Home' | 'Upload Request' | 'Profile';

interface SponsorMarketplaceViewProps {
  activeTab: SponsorTab;
  onSelectTab: (tab: SponsorTab) => void;
  sponsorName: string;
  supportRequests: SupportRequest[];
  sponsorAgreements: SponsorFundingAgreement[];
  workerRequests: WorkerRequest[];
  onReviewSponsorAgreement: (agreement: SponsorFundingAgreement) => void;
  onCreateSponsorAgreementProposal: (request: SupportRequest) => void;
  onUploadSponsorRequestForWorkersAndFarmers: (
    draft: Omit<WorkerRequest, 'id' | 'createdAt' | 'status' | 'workersHired'>
  ) => void;
}

export const SponsorMarketplaceView: React.FC<SponsorMarketplaceViewProps> = ({
  activeTab,
  onSelectTab,
  sponsorName,
  supportRequests,
  sponsorAgreements,
  workerRequests,
  onReviewSponsorAgreement,
  onCreateSponsorAgreementProposal,
  onUploadSponsorRequestForWorkersAndFarmers,
}) => {
  // Upload Request Form State (for workers/farmers to see in marketplace)
  const [reqTitle, setReqTitle] = useState('');
  const [reqProjectName, setReqProjectName] = useState('AgroVanguard Sponsored Farm Block');
  const [reqCategory, setReqCategory] = useState<string>('Harvesting');
  const [reqLocation, setReqLocation] = useState('Iseyin & Ogbomoso Corridor, Oyo State');
  const [reqCount, setReqCount] = useState('6');
  const [reqSkills, setReqSkills] = useState(
    'Experienced farm workers or partner outgrower farmers'
  );
  const [reqStartDate, setReqStartDate] = useState('2026-12-01');
  const [reqDuration, setReqDuration] = useState('5 Days');
  const [reqHours, setReqHours] = useState('7:00 AM – 3:00 PM');
  const [reqPaymentAmount, setReqPaymentAmount] = useState('20000');
  const [reqPaymentBasis, setReqPaymentBasis] = useState<WorkerPaymentBasis>(
    'Per Worker (Total Task)'
  );
  const [reqPaymentMethod, setReqPaymentMethod] = useState(
    'Direct Bank Transfer (NIP) upon Verified Completion'
  );
  const [reqWelfare, setReqWelfare] = useState('Midday meals & field transport provided');
  const [reqDescription, setReqDescription] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Sponsor Profile State
  const [orgName, setOrgName] = useState(sponsorName || 'AgroVanguard Capital NG');
  const [orgFocus, setOrgFocus] = useState(
    '30% Produce & Farm-Funds Share Financing + Sponsored Outgrower Field Requests'
  );
  const [orgLocation, setOrgLocation] = useState('Ibadan & Kaduna Agricultural Corridors');
  const [orgContact, setOrgContact] = useState('investments@agrovanguard.ng');
  const [orgBudget, setOrgBudget] = useState('25000000');
  const [profileSaved, setProfileSaved] = useState<string | null>(null);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqDescription.trim()) return;

    onUploadSponsorRequestForWorkersAndFarmers({
      farmerId: 'sponsor_desk_1',
      farmerName: `${orgName} (Sponsor Desk)`,
      farmName: reqProjectName.trim() || 'Sponsor Agricultural Programme',
      jobTitle: reqTitle.trim(),
      workCategory: reqCategory,
      customWorkCategory: '',
      description: reqDescription.trim(),
      location: reqLocation.trim(),
      workersNeeded: Math.max(1, Number(reqCount) || 1),
      requiredSkills: reqSkills.trim(),
      startDate: reqStartDate,
      expectedDuration: reqDuration.trim(),
      workingHours: reqHours.trim(),
      paymentAmountNaira: Math.max(1000, Number(reqPaymentAmount) || 15000),
      paymentBasis: reqPaymentBasis,
      paymentMethod: reqPaymentMethod.trim(),
      accommodationOrFeeding: reqWelfare.trim(),
      contactInstructions: `Contact ${orgName} via FarmFund Direct Messages.`,
      photographs: [ASSETS.workersHarvest],
      acknowledgedWageRule: true,
    });

    setUploadSuccess(
      `Sponsor request "${reqTitle.trim()}" published! Workers and Farmers can now see and apply for it in the marketplace.`
    );
    setReqTitle('');
    setReqDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Distinctly Differentiated Institutional Sponsor Header */}
      <div className="rounded-3xl border border-indigo-900/20 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-300 uppercase">
              <Building2 className="h-4 w-4" />
              <span>Dedicated Sponsor Capital &amp; Opportunity Desk</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {orgName} — Sponsor Dashboard
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-indigo-100/90">
              Accept sponsorship requests from farmers under the 30% Produce or Farm-Funds Share
              arrangement, or upload new field requests for workers and farmers to see and apply.
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-400/30 bg-indigo-900/50 px-5 py-3.5 text-right backdrop-blur-xs">
            <span className="text-xs text-indigo-200">Agreed Sponsor Return Model</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-amber-300">
              30% Produce or 30% Farm Funds
            </p>
            <p className="mt-1 text-[11px] text-indigo-200">
              {supportRequests.length} Farmer Requests · {sponsorAgreements.length} Agreements
            </p>
          </div>
        </div>

        {/* Strictly 3 Sponsor Tabs: Home, Upload Request, Profile (No Field, Data, or Workers tabs) */}
        <nav
          aria-label="Sponsor Dashboard Sections"
          className="mt-6 flex flex-wrap items-center gap-2 border-t border-indigo-800/60 pt-5"
        >
          {(
            [
              { tab: 'Home', label: 'Home (Accept Farmer Requests)', icon: Home },
              {
                tab: 'Upload Request',
                label: 'Upload Request (For Workers & Farmers)',
                icon: Upload,
              },
              { tab: 'Profile', label: 'Profile', icon: UserCheck },
            ] as { tab: SponsorTab; label: string; icon: React.ComponentType<{ className?: string }> }[]
          ).map(({ tab, label, icon: Icon }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'bg-indigo-950/70 text-indigo-100 hover:bg-indigo-900 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: HOME — ACCEPT FARMER SPONSORSHIP REQUESTS & VIEW ACTIVE AGREEMENTS */}
      {activeTab === 'Home' && (
        <div className="space-y-6">
          {/* Quick CTA Banner to Upload Request for Workers/Farmers */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Need Workers or Outgrower Farmers for a Sponsored Farm Project?
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Upload a request directly from your Sponsor Dashboard so workers and farmers can see
                and apply in real time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('Upload Request')}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-800"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Go to Upload Request</span>
            </button>
          </div>

          {/* Section A: Farmer Sponsorship Requests to Review & Accept */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Farmer Sponsorship Requests (Accept 30% Produce or Funds Share)
                </h2>
                <p className="text-xs text-slate-500">
                  Review incoming requests from farmers and accept or draft a 30% sponsorship
                  agreement.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-indigo-900">
                {supportRequests.length} Farmer Requests Available
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {supportRequests.map((req) => {
                const existingAgr = sponsorAgreements.find((a) => a.requestId === req.id);
                return (
                  <div
                    key={req.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          Farmer: <strong className="text-slate-900">{req.farmerName}</strong> ·{' '}
                          {req.farmName}
                        </span>
                        <span className="font-semibold text-indigo-900">
                          {req.preferredShareModel}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-slate-900">{req.title}</h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {req.location} · {req.farmSize} · Crop: {req.cropOrProduceType}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">{req.description}</p>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white p-3.5 text-xs border border-slate-200/80">
                        <div>
                          <span className="text-slate-500">Requested Support</span>
                          <p className="font-mono font-bold text-slate-900 tabular-nums">
                            ₦{req.fundingAmount.toLocaleString('en-NG')} ({req.assistanceType})
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Estimated Harvest Output</span>
                          <p className="font-semibold text-slate-900">{req.estimatedOutput}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
                      <span className="text-xs font-semibold text-slate-600">
                        Status: <strong className="text-indigo-900">{req.status}</strong>
                      </span>

                      {existingAgr ? (
                        <button
                          type="button"
                          onClick={() => onReviewSponsorAgreement(existingAgr)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-900 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800"
                        >
                          <Sprout className="h-3.5 w-3.5" />
                          <span>
                            {existingAgr.sponsorAccepted
                              ? `View Accepted Agreement (${existingAgr.status})`
                              : 'Review & Accept Farmer Sponsorship'}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onCreateSponsorAgreementProposal(req)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          <Handshake className="h-3.5 w-3.5" />
                          <span>Accept &amp; Draft 30% Sponsorship Agreement</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Active & Pending 30% Agreements */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
              <Scale className="h-4 w-4" />
              <span>30% Sponsorship Agreements Ledger</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {sponsorAgreements.map((agr) => (
                <div
                  key={agr.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 p-5"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Farmer: {agr.farmerName}</span>
                      <span className="font-semibold text-indigo-900">{agr.status}</span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-slate-900">{agr.requestTitle}</h3>
                    <p className="mt-1 text-xs font-semibold text-amber-900">{agr.shareType}</p>
                    <p className="mt-2 text-xs text-slate-600">
                      Contribution: {agr.sponsorContribution} (₦
                      {agr.contributionValueNaira.toLocaleString('en-NG')})
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">
                      Farmer: {agr.farmerAccepted ? 'Accepted' : 'Pending'} · Sponsor:{' '}
                      {agr.sponsorAccepted ? 'Accepted' : 'Pending'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onReviewSponsorAgreement(agr)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-800"
                    >
                      <FileCheck2 className="h-3.5 w-3.5" />
                      <span>Review / Accept 30% Terms</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPLOAD REQUEST FOR WORKERS / FARMERS TO SEE */}
      {activeTab === 'Upload Request' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-semibold text-indigo-900 uppercase">
                Sponsor Opportunity Publisher
              </span>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Upload Request for Workers &amp; Farmers
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Publish a new sponsored field operation, outgrower task, or labour request. Once
                uploaded, workers and farmers can immediately see and apply for it in their portal.
              </p>
            </div>

            {uploadSuccess && (
              <div
                role="status"
                className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-950"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="spn-req-title"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Request / Opportunity Title *
                  </label>
                  <input
                    id="spn-req-title"
                    type="text"
                    required
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g., Sponsored Cassava & Maize Harvest Team (6 Workers/Farmers)"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label
                    htmlFor="spn-req-project"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Sponsor Programme / Farm Name *
                  </label>
                  <input
                    id="spn-req-project"
                    type="text"
                    required
                    value={reqProjectName}
                    onChange={(e) => setReqProjectName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label
                    htmlFor="spn-req-category"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Activity / Work Category *
                  </label>
                  <select
                    id="spn-req-category"
                    value={reqCategory}
                    onChange={(e) => setReqCategory(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-700 focus:outline-hidden"
                  >
                    {FARM_WORK_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="spn-req-location"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Location *
                  </label>
                  <input
                    id="spn-req-location"
                    type="text"
                    required
                    value={reqLocation}
                    onChange={(e) => setReqLocation(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label
                    htmlFor="spn-req-count"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Number of Workers / Farmers Needed *
                  </label>
                  <input
                    id="spn-req-count"
                    type="number"
                    min={1}
                    required
                    value={reqCount}
                    onChange={(e) => setReqCount(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-indigo-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label
                    htmlFor="spn-req-pay"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Agreed Payment / Offer Amount (₦) *
                  </label>
                  <input
                    id="spn-req-pay"
                    type="number"
                    min={1000}
                    required
                    value={reqPaymentAmount}
                    onChange={(e) => setReqPaymentAmount(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-indigo-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label
                    htmlFor="spn-req-basis"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Payment Basis
                  </label>
                  <select
                    id="spn-req-basis"
                    value={reqPaymentBasis}
                    onChange={(e) => setReqPaymentBasis(e.target.value as WorkerPaymentBasis)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-700 focus:outline-hidden"
                  >
                    <option value="Per Worker (Total Task)">Per Worker (Total Task)</option>
                    <option value="Per Worker (Daily)">Per Worker (Daily)</option>
                    <option value="Agreed Total Team Payment">Agreed Total Team Payment</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="spn-req-start"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Start Date &amp; Duration
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <input
                      id="spn-req-start"
                      type="date"
                      value={reqStartDate}
                      onChange={(e) => setReqStartDate(e.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
                    />
                    <input
                      type="text"
                      aria-label="Expected duration"
                      value={reqDuration}
                      onChange={(e) => setReqDuration(e.target.value)}
                      placeholder="e.g., 5 Days"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="spn-req-skills"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Required Skills / Eligibility
                  </label>
                  <input
                    id="spn-req-skills"
                    type="text"
                    value={reqSkills}
                    onChange={(e) => setReqSkills(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="spn-req-hours"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Working Hours
                  </label>
                  <input
                    id="spn-req-hours"
                    type="text"
                    value={reqHours}
                    onChange={(e) => setReqHours(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="spn-req-welfare"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Feeding / Logistics Support
                  </label>
                  <input
                    id="spn-req-welfare"
                    type="text"
                    value={reqWelfare}
                    onChange={(e) => setReqWelfare(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="spn-req-desc"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Detailed Request Description for Workers &amp; Farmers *
                </label>
                <textarea
                  id="spn-req-desc"
                  rows={3}
                  required
                  value={reqDescription}
                  onChange={(e) => setReqDescription(e.target.value)}
                  placeholder="Describe the field work, inputs provided, or farm task so workers and farmers can review and apply..."
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-700 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-900 px-6 py-3 text-xs font-semibold text-white shadow-xs hover:bg-indigo-800"
                >
                  <Upload className="h-4 w-4" />
                  <span>Publish Request for Workers &amp; Farmers</span>
                </button>
              </div>
            </form>
          </div>

          {/* Published Requests Feed */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-bold text-slate-900">
              Published Requests Visible to Workers &amp; Farmers ({workerRequests.length})
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {workerRequests.map((wreq) => (
                <div
                  key={wreq.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs"
                >
                  <div className="flex items-center justify-between text-slate-500">
                    <span>{wreq.farmName}</span>
                    <span className="font-semibold text-indigo-900">{wreq.workCategory}</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-900">{wreq.jobTitle}</p>
                  <p className="mt-1 text-slate-600">{wreq.description}</p>
                  <p className="mt-2 font-mono font-semibold text-slate-900">
                    {wreq.location} · ₦{wreq.paymentAmountNaira.toLocaleString('en-NG')} (
                    {wreq.workersNeeded} needed)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPONSOR PROFILE */}
      {activeTab === 'Profile' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-semibold text-indigo-900 uppercase">
                Verified Institutional Sponsor Profile
              </span>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{orgName}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Manage your sponsor identity, active regional corridors, and 30% share preferences.
              </p>
            </div>
            <UserCheck className="h-7 w-7 text-indigo-900" />
          </div>

          {profileSaved && (
            <div
              role="status"
              className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-900"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>{profileSaved}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setProfileSaved('Sponsor organization profile updated.');
            }}
            className="mt-6 space-y-5"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="spn-org-name" className="block text-xs font-semibold text-slate-700">
                  Sponsor Organization / Full Name
                </label>
                <input
                  id="spn-org-name"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="spn-org-location"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Target Agricultural Corridors
                </label>
                <input
                  id="spn-org-location"
                  type="text"
                  value={orgLocation}
                  onChange={(e) => setOrgLocation(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="spn-org-contact"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Sponsor Desk Contact Email
                </label>
                <input
                  id="spn-org-contact"
                  type="email"
                  value={orgContact}
                  onChange={(e) => setOrgContact(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="spn-org-budget"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Available Seasonal Sponsorship Allocation (₦)
                </label>
                <input
                  id="spn-org-budget"
                  type="number"
                  value={orgBudget}
                  onChange={(e) => setOrgBudget(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="spn-org-focus" className="block text-xs font-semibold text-slate-700">
                Sponsorship Mandate &amp; 30% Share Focus
              </label>
              <textarea
                id="spn-org-focus"
                rows={3}
                value={orgFocus}
                onChange={(e) => setOrgFocus(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-indigo-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-800"
              >
                Save Sponsor Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

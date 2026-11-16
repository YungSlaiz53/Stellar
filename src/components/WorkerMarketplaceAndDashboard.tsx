import React, { useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Filter,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  DirectMessage,
  FARM_WORK_CATEGORIES,
  WorkerAgreement,
  WorkerApplication,
  WorkerPayment,
  WorkerProfile,
  WorkerRequest,
} from '../types/farmfund';

export type WorkerTab =
  | 'Find Farm Jobs'
  | 'My Applications'
  | 'Accepted Jobs'
  | 'My Work History'
  | 'My Profile'
  | 'Messages';

interface WorkerMarketplaceAndDashboardProps {
  activeTab: WorkerTab;
  onSelectTab: (tab: WorkerTab) => void;
  workerRequests: WorkerRequest[];
  workerApplications: WorkerApplication[];
  workerAgreements: WorkerAgreement[];
  workerPayments: WorkerPayment[];
  currentWorkerProfile: WorkerProfile;
  messages: DirectMessage[];
  onApplyForJob: (params: {
    workerRequest: WorkerRequest;
    proposedWageNaira: number;
    message: string;
  }) => void;
  onRespondToJobOffer: (applicationId: string, decision: 'ACCEPT' | 'DECLINE') => void;
  onConfirmPaymentReceipt: (paymentId: string) => void;
  onUpdateWorkerProfile: (updated: WorkerProfile) => void;
  onSendMessageToFarmer: (
    farmerId: string,
    farmerName: string,
    contextTitle: string,
    body: string,
    replyToId?: string,
    replyToPreview?: string
  ) => void;
}

export const WorkerMarketplaceAndDashboard: React.FC<
  WorkerMarketplaceAndDashboardProps
> = ({
  activeTab,
  onSelectTab,
  workerRequests,
  workerApplications,
  workerAgreements,
  workerPayments,
  currentWorkerProfile,
  messages,
  onApplyForJob,
  onRespondToJobOffer,
  onConfirmPaymentReceipt,
  onUpdateWorkerProfile,
  onSendMessageToFarmer,
}) => {
  // Search and Filter State for Marketplace
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [minPaymentFilter, setMinPaymentFilter] = useState<string>('0');

  // Application Modal / Inline Form State
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [proposedWageInput, setProposedWageInput] = useState<string>('10000');
  const [applicationNote, setApplicationNote] = useState('');
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

  // Contact Farmer Inline State
  const [contactJobId, setContactJobId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState('');

  // Worker Profile Editor State
  const [profName, setProfName] = useState(currentWorkerProfile.fullName);
  const [profLocation, setProfLocation] = useState(currentWorkerProfile.location);
  const [profSkills, setProfSkills] = useState(currentWorkerProfile.skills.join(', '));
  const [profExperience, setProfExperience] = useState(currentWorkerProfile.farmingExperience);
  const [profWorkTypes, setProfWorkTypes] = useState(
    currentWorkerProfile.availableWorkTypes.join(', ')
  );
  const [profAvailability, setProfAvailability] = useState(currentWorkerProfile.availability);
  const [profExpectedWage, setProfExpectedWage] = useState(
    String(currentWorkerProfile.expectedWageNaira)
  );
  const [profWageUnit, setProfWageUnit] = useState(currentWorkerProfile.wageUnit);
  const [profPhone, setProfPhone] = useState(currentWorkerProfile.contactPhone);
  const [profPrivacy, setProfPrivacy] = useState<WorkerProfile['contactVisibility']>(
    currentWorkerProfile.contactVisibility
  );
  const [profileSavedNotice, setProfileSavedNotice] = useState<string | null>(null);

  // Per-Message Individual Reply State (Edit 7)
  const [replyBody, setReplyBody] = useState('');
  const [activeReplyMsgId, setActiveReplyMsgId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyFeedback, setReplyFeedback] = useState<string | null>(null);

  const filteredJobs = workerRequests.filter((job) => {
    const matchesLoc =
      !locationQuery.trim() ||
      job.location.toLowerCase().includes(locationQuery.trim().toLowerCase()) ||
      job.jobTitle.toLowerCase().includes(locationQuery.trim().toLowerCase());
    const matchesCat =
      selectedCategory === 'All Categories' || job.workCategory === selectedCategory;
    const matchesPay = job.paymentAmountNaira >= (Number(minPaymentFilter) || 0);
    return matchesLoc && matchesCat && matchesPay;
  });

  const myApplications = workerApplications.filter(
    (app) => app.workerId === currentWorkerProfile.userId
  );

  const acceptedApplications = myApplications.filter(
    (app) => app.status === 'Accepted by Worker' || app.status === 'Work Completed'
  );

  const completedHistoryPayments = workerPayments.filter(
    (pay) => pay.workerId === currentWorkerProfile.userId
  );

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Discover Farm Jobs &amp; Manage Labour Agreements
            </h2>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-right">
            <span className="text-xs text-emerald-900">Worker Wage Guarantee</span>
            <p className="font-mono text-sm font-bold text-emerald-950">
              100% Agreed Wage · 0% Sponsor Deduction
            </p>
          </div>
        </div>

        {/* Worker Dashboard Navigation (6 Mandatory Sections) */}
        <nav
          aria-label="Worker Dashboard Sections"
          className="mt-5 flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1.5"
        >
          {(
            [
              'Find Farm Jobs',
              'My Applications',
              'Accepted Jobs',
              'My Work History',
              'My Profile',
              'Messages',
            ] as WorkerTab[]
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              {tab}
              {tab === 'Find Farm Jobs' && ` (${filteredJobs.length})`}
              {tab === 'My Applications' && ` (${myApplications.length})`}
              {tab === 'Accepted Jobs' && ` (${acceptedApplications.length})`}
              {tab === 'Messages' && ` (${messages.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: FIND FARM JOBS (MARKETPLACE) */}
      {activeTab === 'Find Farm Jobs' && (
        <div className="space-y-5">
          {/* Search & Filters Bar */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-3">
            <div>
              <label
                htmlFor="job-search-location"
                className="block text-xs font-semibold text-slate-700"
              >
                Search by Location or Job Title
              </label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <input
                  id="job-search-location"
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="e.g., Iseyin, Ogbomoso, Zaria, Harvesting..."
                  className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="job-filter-category"
                className="block text-xs font-semibold text-slate-700"
              >
                Filter by Type of Farm Work
              </label>
              <div className="relative mt-1.5">
                <Filter className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <select
                  id="job-filter-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                >
                  <option value="All Categories">All Farm Work Categories</option>
                  {FARM_WORK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="job-filter-payment"
                className="block text-xs font-semibold text-slate-700"
              >
                Filter by Minimum Wage Payment (₦)
              </label>
              <select
                id="job-filter-payment"
                value={minPaymentFilter}
                onChange={(e) => setMinPaymentFilter(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="0">All Payment Amounts (₦0+)</option>
                <option value="5000">₦5,000+ per worker</option>
                <option value="10000">₦10,000+ per worker</option>
                <option value="20000">₦20,000+ per worker</option>
              </select>
            </div>
          </div>

          {applyFeedback && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>{applyFeedback}</span>
            </div>
          )}

          {/* Job Listings Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filteredJobs.map((job) => {
              const alreadyApplied = myApplications.some(
                (a) => a.workerRequestId === job.id
              );

              return (
                <article
                  key={job.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-xs"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {job.farmName} · {job.farmerName}
                      </span>
                      <span className="font-semibold text-emerald-800">
                        {job.workCategory}
                        {job.customWorkCategory ? ` — ${job.customWorkCategory}` : ''}
                      </span>
                    </div>

                    <h3 className="mt-2 text-lg font-bold text-slate-900">{job.jobTitle}</h3>

                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                      <span>{job.location}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Start: <strong className="font-mono">{job.startDate}</strong> (
                        {job.expectedDuration})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{job.workingHours}</span>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      {job.description}
                    </p>

                    <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-slate-500">Agreed Wage Offer:</span>
                        <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                          ₦{job.paymentAmountNaira.toLocaleString('en-NG')} ({job.paymentBasis})
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-slate-500">Workers Needed:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {job.workersNeeded - job.workersHired} spots remaining (of{' '}
                          {job.workersNeeded})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Required Skills: </span>
                        <span className="font-medium text-slate-800">{job.requiredSkills}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Payment Method &amp; Welfare: </span>
                        <span className="text-slate-800">
                          {job.paymentMethod} · {job.accommodationOrFeeding}
                        </span>
                      </div>
                      <div className="pt-1 text-emerald-900 font-medium">
                        Worker Payment Rule: Paid directly for labour (0% sponsor share deduction).
                      </div>
                    </div>
                  </div>

                  {/* Actions: Apply or Contact Farmer */}
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {alreadyApplied ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-4 w-4" />
                          Application Submitted — Track in &ldquo;My Applications&rdquo;
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setApplyingJobId(applyingJobId === job.id ? null : job.id);
                            setProposedWageInput(String(job.paymentAmountNaira));
                          }}
                          className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                        >
                          Apply for This Farm Job
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setContactJobId(contactJobId === job.id ? null : job.id)
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Contact Farmer</span>
                      </button>
                    </div>

                    {applyingJobId === job.id && (
                      <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                        <p className="text-xs font-bold text-slate-900">
                          Submit Job Application to {job.farmerName}
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor={`prop-wage-${job.id}`}
                              className="block text-xs text-slate-700"
                            >
                              Your Agreed / Proposed Wage (₦)
                            </label>
                            <input
                              id={`prop-wage-${job.id}`}
                              type="number"
                              value={proposedWageInput}
                              onChange={(e) => setProposedWageInput(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`app-note-${job.id}`}
                              className="block text-xs text-slate-700"
                            >
                              Relevant Experience Note
                            </label>
                            <input
                              id={`app-note-${job.id}`}
                              type="text"
                              value={applicationNote}
                              onChange={(e) => setApplicationNote(e.target.value)}
                              placeholder="Briefly state your experience with this farm work..."
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setApplyingJobId(null)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onApplyForJob({
                                workerRequest: job,
                                proposedWageNaira:
                                  Number(proposedWageInput) || job.paymentAmountNaira,
                                message:
                                  applicationNote.trim() ||
                                  `Experienced in ${job.workCategory} and ready to start on ${job.startDate}.`,
                              });
                              setApplyingJobId(null);
                              setApplicationNote('');
                              setApplyFeedback(
                                `Application submitted for "${job.jobTitle}". Track status in My Applications.`
                              );
                            }}
                            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                          >
                            Confirm Application
                          </button>
                        </div>
                      </div>
                    )}

                    {contactJobId === job.id && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                        <input
                          type="text"
                          value={contactDraft}
                          onChange={(e) => setContactDraft(e.target.value)}
                          placeholder={`Ask ${job.farmerName} a question about ${job.jobTitle}...`}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!contactDraft.trim()) return;
                            onSendMessageToFarmer(
                              job.farmerId,
                              job.farmerName,
                              job.jobTitle,
                              contactDraft.trim()
                            );
                            setContactDraft('');
                            setContactJobId(null);
                            setApplyFeedback(`Message sent to ${job.farmerName}.`);
                          }}
                          className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white"
                        >
                          Send Message
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MY APPLICATIONS */}
      {activeTab === 'My Applications' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">
            My Farm Job Applications &amp; Wage Offers
          </h3>
          {myApplications.map((app) => (
            <div
              key={app.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{app.workCategory}</span>
                  <span aria-hidden="true">·</span>
                  <span>{app.location}</span>
                  <span aria-hidden="true">·</span>
                  <span>Farmer: {app.farmerName}</span>
                </div>
                <h4 className="mt-1 text-base font-bold text-slate-900">{app.jobTitle}</h4>
                <p className="mt-1 font-mono text-xs text-slate-700 tabular-nums">
                  Agreed / Proposed Wage: ₦{app.proposedWageNaira.toLocaleString('en-NG')} (0%
                  sponsor deduction)
                </p>
                <p className="mt-1 text-xs text-slate-500">Application Note: {app.message}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-xs font-semibold text-emerald-800">
                  Status: {app.status}
                </span>
                {app.status === 'Offered by Farmer' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRespondToJobOffer(app.id, 'ACCEPT')}
                      className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Accept Job Offer (₦{app.proposedWageNaira.toLocaleString('en-NG')})
                    </button>
                    <button
                      type="button"
                      onClick={() => onRespondToJobOffer(app.id, 'DECLINE')}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Decline Offer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: ACCEPTED JOBS */}
      {activeTab === 'Accepted Jobs' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">
            Accepted Farm Jobs &amp; Active Labour Agreements
          </h3>
          {workerAgreements
            .filter((a) => a.workerId === currentWorkerProfile.userId)
            .map((agr) => {
              const payment = workerPayments.find((p) => p.workerAgreementId === agr.id);
              return (
                <div
                  key={agr.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Briefcase className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Farmer: {agr.farmerName}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Start: {agr.startDate} ({agr.expectedDuration})
                        </span>
                      </div>
                      <h4 className="mt-1 text-lg font-bold text-slate-900">{agr.jobTitle}</h4>
                      <p className="mt-1 font-mono text-xs text-slate-700 tabular-nums">
                        Agreed Wage: ₦{agr.agreedWageNaira.toLocaleString('en-NG')} (
                        {agr.paymentBasis}) via {agr.paymentMethod} · Sponsor Share Deducted: ₦0
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-900">
                        Job Status: {agr.status}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-emerald-800">
                        Payment: {payment ? payment.status : 'Pending Work Completion'}
                      </p>
                      {payment && payment.status === 'Awaiting Payment Confirmation' && (
                        <button
                          type="button"
                          onClick={() => onConfirmPaymentReceipt(payment.id)}
                          className="mt-2 rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          Confirm Wage Received (₦{payment.amountNaira.toLocaleString('en-NG')})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* TAB 4: MY WORK HISTORY */}
      {activeTab === 'My Work History' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">
            Completed Farm Work &amp; Verified Wage Ledger
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Payments are only marked &ldquo;Confirmed Paid&rdquo; after both the farmer confirms work
            completion and the worker confirms receipt.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4">Job Title</th>
                  <th className="py-2.5 px-4">Farmer</th>
                  <th className="py-2.5 px-4 text-right">Agreed Wage (₦)</th>
                  <th className="py-2.5 px-4 text-right">Sponsor Deduction</th>
                  <th className="py-2.5 px-4">Payment Status</th>
                  <th className="py-2.5 pl-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedHistoryPayments.map((pay) => (
                  <tr key={pay.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{pay.jobTitle}</td>
                    <td className="py-3 px-4 text-slate-700">{pay.farmerName}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      ₦{pay.amountNaira.toLocaleString('en-NG')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800 tabular-nums">
                      ₦0 (0%)
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-800">{pay.status}</td>
                    <td className="py-3 pl-4">
                      {pay.status === 'Awaiting Payment Confirmation' ? (
                        <button
                          type="button"
                          onClick={() => onConfirmPaymentReceipt(pay.id)}
                          className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          Confirm Receipt
                        </button>
                      ) : (
                        <span className="font-mono text-slate-500">
                          {pay.paidAt ? pay.paidAt.slice(0, 10) : 'Awaiting completion'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: MY PROFILE */}
      {activeTab === 'My Profile' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-4">
              <img
                src={currentWorkerProfile.profilePicture}
                alt={currentWorkerProfile.fullName}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full object-cover border border-slate-200"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Worker Account Profile — {currentWorkerProfile.fullName}
                </h3>
                <p className="text-xs text-emerald-800 font-semibold">
                  Verification Status: {currentWorkerProfile.verificationStatus} ·{' '}
                  {currentWorkerProfile.completedJobsCount} Completed Farm Jobs
                </p>
              </div>
            </div>
            <UserCheck className="h-6 w-6 text-emerald-700" />
          </div>

          {profileSavedNotice && (
            <div
              role="status"
              className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-900"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>{profileSavedNotice}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateWorkerProfile({
                ...currentWorkerProfile,
                fullName: profName.trim() || currentWorkerProfile.fullName,
                location: profLocation.trim() || currentWorkerProfile.location,
                skills: profSkills
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
                farmingExperience: profExperience.trim(),
                availableWorkTypes: profWorkTypes
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
                availability: profAvailability.trim(),
                expectedWageNaira: Number(profExpectedWage) || 10000,
                wageUnit: profWageUnit.trim(),
                contactPhone: profPhone.trim(),
                contactVisibility: profPrivacy,
              });
              setProfileSavedNotice('Worker profile and privacy preferences updated.');
            }}
            className="mt-6 space-y-5"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700">
                  Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="prof-loc" className="block text-xs font-semibold text-slate-700">
                  Location
                </label>
                <input
                  id="prof-loc"
                  type="text"
                  value={profLocation}
                  onChange={(e) => setProfLocation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="prof-skills" className="block text-xs font-semibold text-slate-700">
                  Skills (Comma-separated)
                </label>
                <input
                  id="prof-skills"
                  type="text"
                  value={profSkills}
                  onChange={(e) => setProfSkills(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="prof-work-types"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Types of Work Available
                </label>
                <input
                  id="prof-work-types"
                  type="text"
                  value={profWorkTypes}
                  onChange={(e) => setProfWorkTypes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="prof-avail" className="block text-xs font-semibold text-slate-700">
                  Availability
                </label>
                <input
                  id="prof-avail"
                  type="text"
                  value={profAvailability}
                  onChange={(e) => setProfAvailability(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prof-wage" className="block text-xs font-semibold text-slate-700">
                    Expected Wage (₦)
                  </label>
                  <input
                    id="prof-wage"
                    type="number"
                    value={profExpectedWage}
                    onChange={(e) => setProfExpectedWage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="prof-unit" className="block text-xs font-semibold text-slate-700">
                    Wage Basis
                  </label>
                  <input
                    id="prof-unit"
                    type="text"
                    value={profWageUnit}
                    onChange={(e) => setProfWageUnit(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="prof-phone" className="block text-xs font-semibold text-slate-700">
                  Contact Phone Number
                </label>
                <input
                  id="prof-phone"
                  type="text"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="prof-privacy"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Contact Information Privacy Control
                </label>
                <select
                  id="prof-privacy"
                  value={profPrivacy}
                  onChange={(e) =>
                    setProfPrivacy(e.target.value as WorkerProfile['contactVisibility'])
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                >
                  <option value="Accepted Farmers Only">
                    Share Phone Only With Accepted Job Farmers
                  </option>
                  <option value="Verified Farmers">Share With All Verified Farmers</option>
                  <option value="Hidden Until Offer">
                    Keep Phone Hidden (Use FarmFund Messages Only)
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="prof-exp" className="block text-xs font-semibold text-slate-700">
                Farming Experience Summary
              </label>
              <textarea
                id="prof-exp"
                rows={3}
                value={profExperience}
                onChange={(e) => setProfExperience(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Save Worker Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 6: MESSAGES */}
      {activeTab === 'Messages' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                FarmFund Direct Messages (Farmer &amp; Worker Communication)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Reply directly to any individual message thread below, or start a new message.
              </p>
            </div>
          </div>

          {replyFeedback && (
            <div
              role="status"
              className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>{replyFeedback}</span>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {messages.map((msg) => {
              const isReplyOpen = activeReplyMsgId === msg.id;
              const currentDraft = replyDrafts[msg.id] || '';
              const replyTargetId =
                msg.senderId === currentWorkerProfile.userId ? msg.recipientId : msg.senderId;
              const replyTargetName =
                msg.senderId === currentWorkerProfile.userId
                  ? msg.recipientName
                  : msg.senderName;

              return (
                <div
                  key={msg.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      <strong className="text-slate-900">{msg.senderName}</strong> ({msg.senderRole})
                      → {msg.recipientName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono">{msg.createdAt.slice(0, 10)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveReplyMsgId(isReplyOpen ? null : msg.id)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/40 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>{isReplyOpen ? 'Cancel Reply' : 'Reply'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="mt-1 text-xs font-semibold text-emerald-800">
                    Job: {msg.contextTitle}
                  </p>

                  {msg.replyToPreview && (
                    <div className="mt-2 rounded-lg border-l-2 border-emerald-600 bg-white/80 px-3 py-1.5 text-xs text-slate-500 italic">
                      Replying to: &ldquo;{msg.replyToPreview}&rdquo;
                    </div>
                  )}

                  <p className="mt-1.5 text-sm text-slate-800">{msg.body}</p>

                  {isReplyOpen && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!currentDraft.trim()) return;
                        onSendMessageToFarmer(
                          replyTargetId,
                          replyTargetName,
                          msg.contextTitle,
                          currentDraft.trim(),
                          msg.id,
                          msg.body.slice(0, 90)
                        );
                        setReplyDrafts((prev) => ({ ...prev, [msg.id]: '' }));
                        setActiveReplyMsgId(null);
                        setReplyFeedback(
                          `Reply sent to ${replyTargetName} regarding "${msg.contextTitle}".`
                        );
                      }}
                      className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3"
                    >
                      <input
                        type="text"
                        aria-label={`Reply to ${msg.senderName}`}
                        value={currentDraft}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [msg.id]: e.target.value,
                          }))
                        }
                        placeholder={`Reply specifically to ${replyTargetName} about "${msg.contextTitle}"...`}
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        Send Reply
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!replyBody.trim()) return;
              onSendMessageToFarmer(
                'demo_farmer_1',
                'Adewale Ogunleye',
                'Maize & Tomato Harvest Field Team (5 Workers)',
                replyBody.trim()
              );
              setReplyBody('');
              setReplyFeedback('New message sent to Farmer Adewale Ogunleye.');
            }}
            className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4"
          >
            <input
              type="text"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a new message to Farmer Adewale Ogunleye..."
              className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Send Message
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

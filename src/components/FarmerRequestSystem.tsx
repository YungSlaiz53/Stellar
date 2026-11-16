import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Handshake,
  Plus,
  Scale,
  Sprout,
} from 'lucide-react';
import {
  AssistanceType,
  ShareArrangementType,
  SponsorFundingAgreement,
  SupportRequest,
} from '../types/farmfund';
import {
  calculateSponsorThirtyPercentShare,
  validateSupportRequestDraft,
} from '../utils/farmfundLogic';
import { ASSETS } from '../data/seedData';

export type FarmerTab =
  | 'Request Farm Support'
  | 'My Support Requests'
  | 'My Agreements';

interface FarmerRequestSystemProps {
  activeTab: FarmerTab;
  onSelectTab: (tab: FarmerTab) => void;
  supportRequests: SupportRequest[];
  sponsorAgreements: SponsorFundingAgreement[];
  onSubmitSupportRequest: (req: Omit<SupportRequest, 'id' | 'createdAt' | 'status'>) => void;
  onReviewSponsorAgreement: (agreement: SponsorFundingAgreement) => void;
  onCreateSponsorAgreementProposal: (request: SupportRequest) => void;
}

export const FarmerRequestSystem: React.FC<FarmerRequestSystemProps> = ({
  activeTab,
  onSelectTab,
  supportRequests,
  sponsorAgreements,
  onSubmitSupportRequest,
  onReviewSponsorAgreement,
  onCreateSponsorAgreementProposal,
}) => {
  // Support Request Form State
  const [supTitle, setSupTitle] = useState('');
  const [supFarmName, setSupFarmName] = useState('Ogunleye Green Acres Ltd');
  const [supFarmingType, setSupFarmingType] = useState('Arable Crop Farming');
  const [supCropType, setSupCropType] = useState('');
  const [supLocation, setSupLocation] = useState('');
  const [supFarmSize, setSupFarmSize] = useState('');
  const [supDescription, setSupDescription] = useState('');
  const [supAssistanceType, setSupAssistanceType] = useState<AssistanceType>('Combined Support');
  const [supFundingAmount, setSupFundingAmount] = useState<string>('1500000');
  const [supMaterials, setSupMaterials] = useState('');
  const [supFarmingPeriod, setSupFarmingPeriod] = useState('4 Months');
  const [supHarvestDate, setSupHarvestDate] = useState('2027-04-15');
  const [supEstimatedOutput, setSupEstimatedOutput] = useState('');
  const [supPreferredShare, setSupPreferredShare] = useState<ShareArrangementType>(
    '30% Farm Produce Share'
  );
  const [supPhotoInput, setSupPhotoInput] = useState(ASSETS.supportProject);
  const [supDocInput, setSupDocInput] = useState('Farm_Registration_Certificate.pdf');
  const [supAcknowledged, setSupAcknowledged] = useState(false);
  const [supError, setSupError] = useState<string | null>(null);
  const [supSuccess, setSupSuccess] = useState<string | null>(null);

  const previewSponsorShare = calculateSponsorThirtyPercentShare({
    shareType: supPreferredShare,
    eligibleTotalAmount:
      supPreferredShare === '30% Farm Produce Share'
        ? 300
        : Number(supFundingAmount || 0) * 2.2,
    unitLabel: supPreferredShare === '30% Farm Produce Share' ? 'bags of harvest output' : 'NGN',
  });

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSupError(null);
    setSupSuccess(null);

    const draft: Omit<SupportRequest, 'id' | 'createdAt' | 'status'> = {
      farmerId: 'demo_farmer_1',
      farmerName: 'Adewale Ogunleye',
      title: supTitle.trim(),
      farmName: supFarmName.trim(),
      farmingType: supFarmingType.trim(),
      cropOrProduceType: supCropType.trim(),
      location: supLocation.trim(),
      farmSize: supFarmSize.trim(),
      description: supDescription.trim(),
      assistanceType: supAssistanceType,
      fundingAmount: Number(supFundingAmount) || 0,
      materialsOrEquipment: supMaterials.trim(),
      farmingPeriod: supFarmingPeriod.trim(),
      expectedHarvestDate: supHarvestDate,
      estimatedOutput: supEstimatedOutput.trim(),
      preferredShareModel: supPreferredShare,
      acknowledgedThirtyPercentNotice: supAcknowledged,
      photographs: supPhotoInput.trim() ? [supPhotoInput.trim()] : [ASSETS.supportProject],
      supportingDocuments: supDocInput.trim() ? [supDocInput.trim()] : [],
    };

    const validationError = validateSupportRequestDraft(draft);
    if (validationError) {
      setSupError(validationError);
      return;
    }

    onSubmitSupportRequest(draft);
    setSupSuccess(
      'Farm Support Request submitted for sponsors to review. No 30% deduction is taken on submission; the 30% arrangement becomes active only after both you and a sponsor explicitly review and accept a formal Support Agreement.'
    );
    setSupTitle('');
    setSupCropType('');
    setSupLocation('');
    setSupFarmSize('');
    setSupDescription('');
    setSupEstimatedOutput('');
    setSupAcknowledged(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Service Distinction + Request Farm Support Header (Edit 8: Removed Request Farm Workers from Farmer Request Page) */}
      <section aria-label="Farmer Support Request Centre">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
            Farmer Support Request Centre
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
            Submit a Farm Support Request for sponsors to review and fund under the 30% share
            arrangement.
          </p>

          {/* Mandatory Request Page Distinction Blocks */}
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-xs font-bold text-emerald-950 sm:text-sm">
                1. Sponsors (30% Produce or Farm-Funds Share)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">
                Provide funding, seeds, fertiliser, or equipment under an agreed{' '}
                <strong>30% Farm Produce Share</strong> or{' '}
                <strong>30% Farm Funds Share</strong> accepted by both parties.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold text-slate-900 sm:text-sm">
                2. Farm Workers (100% Agreed Wage · 0% Sponsor Share)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">
                Hired for farm labour activities and paid their{' '}
                <strong>separately agreed wages</strong> with{' '}
                <strong>0% sponsor share deduction</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Single Farm Support Action Card (Edit 3: Removed Open Farm Support Form button) */}
        <div className="rounded-2xl border-2 border-emerald-700 bg-emerald-50/70 p-5 text-slate-900 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
                <Sprout className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Request Farm Support</h3>
                <p className="text-xs font-medium text-emerald-800">
                  For money, materials, equipment and sponsor assistance (30% Share Model)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Farmer Support Navigation Bar (Edit 8: Removed Worker Request tabs from Farmer Request System) */}
      <nav
        aria-label="Farmer Support Sections"
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5"
      >
        {(
          [
            'Request Farm Support',
            'My Support Requests',
            'My Agreements',
          ] as FarmerTab[]
        ).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onSelectTab(tab)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab}
            {tab === 'My Support Requests' && ` (${supportRequests.length})`}
            {tab === 'My Agreements' && ` (${sponsorAgreements.length})`}
          </button>
        ))}
      </nav>

      {/* TAB 1: REQUEST FARM SUPPORT FORM (Edit 3: Removed 'Sponsor Assistance Workflow · Financial, Materials & Equipment Support') */}
      {activeTab === 'Request Farm Support' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="border-b border-slate-200 pb-5">
            <h3 className="text-xl font-bold text-slate-900">
              Request Farm Support Form
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Complete this form if you are seeking financial support, farm funding, agricultural
              materials, equipment, or other sponsor assistance.
            </p>
          </div>

          {/* Highly Visible 30% Sponsor Agreement Notice */}
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50/90 p-5">
            <div className="flex items-start gap-3.5">
              <Scale className="mt-0.5 h-6 w-6 shrink-0 text-amber-800" />
              <div className="space-y-3">
                <h4 className="text-sm font-bold tracking-wide text-amber-950">
                  IMPORTANT SPONSOR AGREEMENT
                </h4>
                <p className="text-sm font-medium leading-relaxed text-amber-950">
                  &ldquo;By requesting sponsor funding through FarmFund, you acknowledge that the
                  sponsor&apos;s agreed return is 30% of the farm produce or the agreed farm funds,
                  depending on the support arrangement selected and accepted by both parties.&rdquo;
                </p>
                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  <div className="rounded-xl border border-amber-200 bg-white p-3.5">
                    <p className="text-xs font-bold text-slate-900">
                      1. 30% Farm Produce Share
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      The sponsor receives an agreed 30% share of the eligible farm produce or
                      harvest from the supported farming project.
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white p-3.5">
                    <p className="text-xs font-bold text-slate-900">
                      2. 30% Farm Funds Share
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      The sponsor receives an agreed 30% share of the eligible farm funds or
                      proceeds, as clearly defined in the funding agreement.
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-amber-900">
                  <strong>No Automatic Deduction on Request Submission:</strong> Submitting this
                  request does not automatically deduct or collect 30%. Before any agreement becomes
                  active, both Farmer and Sponsor must review and explicitly accept the full terms.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSupportSubmit} className="mt-6 space-y-6">
            {supError && (
              <div
                role="alert"
                className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{supError}</span>
              </div>
            )}
            {supSuccess && (
              <div
                role="status"
                className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>{supSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="sup-title"
                  className="block text-xs font-semibold text-slate-700"
                >
                  1. Request Title *
                </label>
                <input
                  id="sup-title"
                  type="text"
                  value={supTitle}
                  onChange={(e) => setSupTitle(e.target.value)}
                  placeholder="e.g., 10-Hectare Hybrid Maize & Soybeans Input Support"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="sup-farm-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  2. Farmer&apos;s Farm Name *
                </label>
                <input
                  id="sup-farm-name"
                  type="text"
                  value={supFarmName}
                  onChange={(e) => setSupFarmName(e.target.value)}
                  placeholder="e.g., Ogunleye Green Acres Ltd"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="sup-farming-type"
                  className="block text-xs font-semibold text-slate-700"
                >
                  3. Farming Type *
                </label>
                <select
                  id="sup-farming-type"
                  value={supFarmingType}
                  onChange={(e) => setSupFarmingType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                >
                  <option value="Arable Crop Farming">Arable Crop Farming (Grains &amp; Legumes)</option>
                  <option value="Root & Tuber Cultivation">Root &amp; Tuber Cultivation (Cassava, Yam)</option>
                  <option value="Horticulture & Vegetables">Horticulture &amp; Vegetables</option>
                  <option value="Tree Crops & Agroforestry">Tree Crops &amp; Agroforestry (Cocoa, Oil Palm)</option>
                  <option value="Livestock & Poultry">Livestock, Aquaculture &amp; Poultry</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="sup-crop-type"
                  className="block text-xs font-semibold text-slate-700"
                >
                  4. Crop or Produce Type *
                </label>
                <input
                  id="sup-crop-type"
                  type="text"
                  value={supCropType}
                  onChange={(e) => setSupCropType(e.target.value)}
                  placeholder="e.g., Yellow Maize (SAMMAZ 52) & Cassava"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="sup-location"
                  className="block text-xs font-semibold text-slate-700"
                >
                  5. Farm Location *
                </label>
                <input
                  id="sup-location"
                  type="text"
                  value={supLocation}
                  onChange={(e) => setSupLocation(e.target.value)}
                  placeholder="e.g., Iseyin, Oyo State"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="sup-farm-size"
                  className="block text-xs font-semibold text-slate-700"
                >
                  6. Farm Size *
                </label>
                <input
                  id="sup-farm-size"
                  type="text"
                  value={supFarmSize}
                  onChange={(e) => setSupFarmSize(e.target.value)}
                  placeholder="e.g., 10 Hectares (25 Acres)"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="sup-description"
                className="block text-xs font-semibold text-slate-700"
              >
                7. Description of the Farming Project *
              </label>
              <textarea
                id="sup-description"
                rows={3}
                value={supDescription}
                onChange={(e) => setSupDescription(e.target.value)}
                placeholder="Describe your cultivation plan, soil preparation status, target market or off-takers, and how sponsor support will be used..."
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="sup-assistance-type"
                  className="block text-xs font-semibold text-slate-700"
                >
                  8. Type of Assistance Required *
                </label>
                <select
                  id="sup-assistance-type"
                  value={supAssistanceType}
                  onChange={(e) => setSupAssistanceType(e.target.value as AssistanceType)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                >
                  <option value="Financial Support">Financial Support</option>
                  <option value="Agricultural Materials">Agricultural Materials (Seeds/Fertiliser)</option>
                  <option value="Equipment">Equipment &amp; Irrigation</option>
                  <option value="Combined Support">Combined Support (Funds + Materials)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="sup-funding-amount"
                  className="block text-xs font-semibold text-slate-700"
                >
                  9. Amount of Funding Required (₦, if applicable)
                </label>
                <input
                  id="sup-funding-amount"
                  type="number"
                  min={0}
                  value={supFundingAmount}
                  onChange={(e) => setSupFundingAmount(e.target.value)}
                  placeholder="1500000"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="sup-materials"
                  className="block text-xs font-semibold text-slate-700"
                >
                  10. Materials or Equipment Required (if applicable)
                </label>
                <input
                  id="sup-materials"
                  type="text"
                  value={supMaterials}
                  onChange={(e) => setSupMaterials(e.target.value)}
                  placeholder="e.g., 40 bags NPK 15-15-15, solar drip lines"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="sup-period"
                  className="block text-xs font-semibold text-slate-700"
                >
                  11. Expected Farming Period *
                </label>
                <input
                  id="sup-period"
                  type="text"
                  value={supFarmingPeriod}
                  onChange={(e) => setSupFarmingPeriod(e.target.value)}
                  placeholder="e.g., 4 Months (120 Days)"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="sup-harvest-date"
                  className="block text-xs font-semibold text-slate-700"
                >
                  12. Expected Harvest Date *
                </label>
                <input
                  id="sup-harvest-date"
                  type="date"
                  value={supHarvestDate}
                  onChange={(e) => setSupHarvestDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="sup-estimated-output"
                  className="block text-xs font-semibold text-slate-700"
                >
                  13. Estimated Harvest or Farm Output *
                </label>
                <input
                  id="sup-estimated-output"
                  type="text"
                  value={supEstimatedOutput}
                  onChange={(e) => setSupEstimatedOutput(e.target.value)}
                  placeholder="e.g., 35 Metric Tonnes (350 bags)"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="sup-photos"
                  className="block text-xs font-semibold text-slate-700"
                >
                  14. Farm Photographs (Image URL or Reference)
                </label>
                <input
                  id="sup-photos"
                  type="text"
                  value={supPhotoInput}
                  onChange={(e) => setSupPhotoInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="sup-docs"
                  className="block text-xs font-semibold text-slate-700"
                >
                  15. Additional Supporting Documents (Title / Reference)
                </label>
                <input
                  id="sup-docs"
                  type="text"
                  value={supDocInput}
                  onChange={(e) => setSupDocInput(e.target.value)}
                  placeholder="e.g., Soil_Analysis_2026.pdf, Cooperative_Certificate.pdf"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Preferred 30% Arrangement Selector */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-900">
                Select Proposed 30% Sponsor Return Arrangement *
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    '30% Farm Produce Share',
                    '30% Farm Funds Share',
                  ] as ShareArrangementType[]
                ).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSupPreferredShare(option)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      supPreferredShare === option
                        ? 'border-emerald-700 bg-emerald-50/80 text-emerald-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold">{option}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {option === '30% Farm Produce Share'
                        ? 'Sponsor receives an agreed 30% share of the eligible farm produce or harvest from the supported farming project.'
                        : 'Sponsor receives an agreed 30% share of the eligible farm funds or proceeds, as clearly defined in the funding agreement.'}
                    </p>
                  </button>
                ))}
              </div>
              <p className="mt-3 font-mono text-xs text-emerald-900">
                Projected Split Preview: {previewSponsorShare.formattedSummary}
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={supAcknowledged}
                onChange={(e) => setSupAcknowledged(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span className="text-xs leading-relaxed">
                I have read and understood the <strong>IMPORTANT SPONSOR AGREEMENT (30% Share)</strong>{' '}
                notice above. I understand that no 30% share is deducted automatically upon request
                submission, that both Farmer and Sponsor must explicitly review and accept the
                agreement terms before activation, and that harvest/profit is not guaranteed.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-800 active:scale-[0.99]"
              >
                <Plus className="h-4 w-4" />
                <span>Submit Farm Support Request</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: MY SUPPORT REQUESTS */}
      {activeTab === 'My Support Requests' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                My Farm Support Requests (30% Sponsor Share System)
              </h3>
              <p className="text-xs text-slate-600">
                Track your financial, material, and equipment support requests and review formal 30%
                produce or farm-funds agreements.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('Request Farm Support')}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              + New Farm Support Request
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {supportRequests.map((req) => {
              const linkedAgreement = sponsorAgreements.find((a) => a.requestId === req.id);
              return (
                <div
                  key={req.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {req.farmName} · {req.location} · {req.farmSize}
                      </span>
                      <span className="font-semibold text-emerald-800">{req.status}</span>
                    </div>
                    <h4 className="mt-2 text-lg font-bold text-slate-900">{req.title}</h4>
                    <p className="mt-1 text-xs text-slate-600">
                      {req.farmingType} · {req.cropOrProduceType} · {req.assistanceType}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      {req.description}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 text-xs">
                      <div>
                        <span className="text-slate-500">Funding / Value Requested</span>
                        <p className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                          ₦{req.fundingAmount.toLocaleString('en-NG')}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Selected 30% Arrangement</span>
                        <p className="mt-0.5 font-semibold text-emerald-800">
                          {req.preferredShareModel}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Expected Harvest</span>
                        <p className="mt-0.5 font-mono text-slate-800">
                          {req.expectedHarvestDate} ({req.farmingPeriod})
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Estimated Output</span>
                        <p className="mt-0.5 font-medium text-slate-800">{req.estimatedOutput}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-500">
                      Docs: {req.supportingDocuments.join(', ') || 'Attached'}
                    </span>
                    {linkedAgreement ? (
                      <button
                        type="button"
                        onClick={() => onReviewSponsorAgreement(linkedAgreement)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Review 30% Agreement ({linkedAgreement.status})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCreateSponsorAgreementProposal(req)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 px-3.5 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
                      >
                        <Handshake className="h-3.5 w-3.5" />
                        <span>Generate 30% Sponsor Agreement Terms</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MY AGREEMENTS */}
      {activeTab === 'My Agreements' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-bold text-slate-900">
              My Sponsor Support Agreements ({sponsorAgreements.length})
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Review and accept 30% Farm Produce Share or 30% Farm Funds Share agreements with
              sponsors.
            </p>
          </div>

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
                    <span>Sponsor: {agr.sponsorName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-emerald-800">{agr.shareType}</span>
                  </div>
                  <h4 className="mt-1 text-base font-bold text-slate-900">
                    {agr.requestTitle}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600">
                    Contribution: {agr.sponsorContribution} (₦
                    {agr.contributionValueNaira.toLocaleString('en-NG')})
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Farmer Accepted: {agr.farmerAccepted ? 'Yes' : 'Pending'} · Sponsor Accepted:{' '}
                    {agr.sponsorAccepted ? 'Yes' : 'Pending'} · Status:{' '}
                    <strong className="text-slate-900">{agr.status}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onReviewSponsorAgreement(agr)}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
                >
                  Inspect &amp; Accept 30% Agreement
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

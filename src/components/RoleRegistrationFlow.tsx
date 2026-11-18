import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileUp,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  FARM_WORK_CATEGORIES,
  PlatformUser,
  PublicUserRole,
  RegistrationPayload,
  SponsorType,
  SUPERVISOR_SPECIALISATIONS,
  SUPPORT_CATEGORY_OPTIONS,
} from '../types/farmfund';
import { validateRegistrationPayload } from '../utils/farmfundLogic';

interface RoleRegistrationFlowProps {
  role: PublicUserRole;
  onBackToHome: () => void;
  onSwitchToSignIn: () => void;
  onRegistered: (user: PlatformUser, snapshot: Record<string, unknown>) => void;
}

export const RoleRegistrationFlow: React.FC<RoleRegistrationFlowProps> = ({
  role,
  onBackToHome,
  onSwitchToSignIn,
  onRegistered,
}) => {
  const [sponsorType, setSponsorType] = useState<SponsorType>('individual');

  // Shared Identity & Location
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+234');
  const [country, setCountry] = useState('Nigeria');
  const [stateName, setStateName] = useState('');
  const [lga, setLga] = useState('');
  const [townOrLocation, setTownOrLocation] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [governmentIdDocument, setGovernmentIdDocument] = useState('');

  // Worker fields
  const [skillsText, setSkillsText] = useState('');
  const [farmingExperience, setFarmingExperience] = useState('');
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([]);
  const [expectedWageNaira, setExpectedWageNaira] = useState('5000');
  const [wageUnit, setWageUnit] = useState('Per Day');
  const [availability, setAvailability] = useState('Full-time / Immediate');
  const [bio, setBio] = useState('');
  const [supportingDocsText, setSupportingDocsText] = useState('');

  // Farmer fields
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [farmingType, setFarmingType] = useState('Arable Crop Farming');
  const [cropsOrLivestock, setCropsOrLivestock] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [farmDescription, setFarmDescription] = useState('');
  const [supportNeeded, setSupportNeeded] = useState<string[]>(['Financial Support']);
  const [farmPhotoRef, setFarmPhotoRef] = useState('');

  // Supervisor fields
  const [professionalQualifications, setProfessionalQualifications] = useState('');
  const [agriculturalExperience, setAgriculturalExperience] = useState('');
  const [specialisations, setSpecialisations] = useState<string[]>([]);
  const [previousSupervisionExperience, setPreviousSupervisionExperience] = useState('');
  const [certificationsText, setCertificationsText] = useState('');
  const [availabilityLocations, setAvailabilityLocations] = useState('');

  // Sponsor Individual + Organisation fields
  const [sponsorDescription, setSponsorDescription] = useState('');
  const [agriculturalInterestsText, setAgriculturalInterestsText] = useState(
    'Maize, Cassava, Irrigation'
  );
  const [supportTypesProvided, setSupportTypesProvided] = useState<string[]>(['Financial Support']);
  const [socialMediaLinks, setSocialMediaLinks] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [organisationType, setOrganisationType] = useState('Agribusiness Company');
  const [representativeName, setRepresentativeName] = useState('');
  const [representativePosition, setRepresentativePosition] = useState('');
  const [representativeIdDocument, setRepresentativeIdDocument] = useState('');
  const [registrationDocsText, setRegistrationDocsText] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleMulti = (
    item: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleFilePicked = (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (value: string) => void,
    readDataUrl = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (readDataUrl && file.size <= 350000) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') onResult(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      onResult(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const payload: RegistrationPayload = {
      role,
      sponsorType: role === 'Sponsor' ? sponsorType : undefined,
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
      country: country.trim(),
      state: stateName.trim(),
      lga: lga.trim(),
      townOrLocation: townOrLocation.trim(),
      profilePicture: profilePicture.trim(),
      governmentIdDocument: governmentIdDocument.trim(),
      skills: skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      farmingExperience: farmingExperience.trim(),
      availableWorkTypes: selectedWorkTypes,
      expectedWageNaira: Number(expectedWageNaira) || 0,
      wageUnit,
      availability: availability.trim(),
      bio: bio.trim(),
      supportingDocuments: supportingDocsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      farmName: farmName.trim(),
      farmLocation: farmLocation.trim() || townOrLocation.trim(),
      farmingType: farmingType.trim(),
      cropsOrLivestock: cropsOrLivestock.trim(),
      farmSize: farmSize.trim(),
      yearsOfExperience: yearsOfExperience.trim(),
      farmDescription: farmDescription.trim(),
      agriculturalSupportNeeded: supportNeeded,
      farmPhotographs: farmPhotoRef.trim() ? [farmPhotoRef.trim()] : [],
      professionalQualifications: professionalQualifications.trim(),
      agriculturalExperience: agriculturalExperience.trim(),
      specialisations,
      previousSupervisionExperience: previousSupervisionExperience.trim(),
      certifications: certificationsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      availabilityAndServiceLocations: availabilityLocations.trim(),
      description: sponsorDescription.trim(),
      agriculturalInterests: agriculturalInterestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      supportTypesProvided,
      socialMediaLinks: socialMediaLinks.trim(),
      organisationName: organisationName.trim(),
      officeAddress: officeAddress.trim(),
      logoUrl: logoUrl.trim(),
      website: website.trim(),
      organisationType: organisationType.trim(),
      representativeName: representativeName.trim(),
      representativePosition: representativePosition.trim(),
      representativeIdDocument: representativeIdDocument.trim(),
      registrationDocuments: registrationDocsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      agriculturalSupportCategories: agriculturalInterestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    const validationError = validateRegistrationPayload(payload);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        user?: PlatformUser;
        snapshot?: Record<string, unknown>;
      };
      if (!res.ok || !data.user || !data.snapshot) {
        throw new Error(data.error || 'Registration failed.');
      }
      onRegistered(data.user, data.snapshot);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8F3] px-4 py-8 text-[#243629] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#243629] transition-colors hover:bg-[#EAF6EC]"
          >
            <ArrowLeft className="h-4 w-4 text-[#159B42]" />
            <span>Back to FarmFund Home</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-xs font-bold text-[#116B32] hover:underline"
          >
            Already have a FarmFund account? Sign In →
          </button>
        </div>

        <div className="rounded-3xl border border-emerald-900/15 bg-white p-6 shadow-sm sm:p-9">
          <div className="border-b border-slate-100 pb-5">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#159B42]">
              Role-Locked Registration · Account Role: {role}
            </span>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#243629] sm:text-3xl">
              Register as a {role}
            </h1>
            <p className="mt-1.5 text-sm text-[#718071]">
              Your primary role ({role}) is locked to your account upon submission and cannot be
              self-changed later. Initial verification status will be set to{' '}
              <strong className="text-[#243629]">Pending Verification</strong>.
            </p>
          </div>

          {role === 'Sponsor' && (
            <div className="mt-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#718071]">
                Select Sponsor Account Type
              </label>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSponsorType('individual')}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                    sponsorType === 'individual'
                      ? 'border-[#159B42] bg-[#EAF6EC]'
                      : 'border-slate-200 bg-white hover:bg-[#F5F8F3]'
                  }`}
                >
                  <User className="mt-0.5 h-5 w-5 text-[#159B42]" />
                  <div>
                    <p className="text-sm font-bold text-[#243629]">Individual Sponsor</p>
                    <p className="mt-0.5 text-xs text-[#718071]">
                      Support farmers or hire workers as an individual agricultural sponsor.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSponsorType('organisation')}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                    sponsorType === 'organisation'
                      ? 'border-[#159B42] bg-[#EAF6EC]'
                      : 'border-slate-200 bg-white hover:bg-[#F5F8F3]'
                  }`}
                >
                  <Building2 className="mt-0.5 h-5 w-5 text-[#159B42]" />
                  <div>
                    <p className="text-sm font-bold text-[#243629]">
                      Company / Organisation Sponsor
                    </p>
                    <p className="mt-0.5 text-xs text-[#718071]">
                      Agribusinesses, cooperatives, funds, or NGOs with organisation verification.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-900"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Common Identity & Credentials */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-[#243629]">
                1. Account &amp; Location Details
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {!(role === 'Sponsor' && sponsorType === 'organisation') ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your legal full name"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Organisation or Company Name *
                    </label>
                    <input
                      type="text"
                      value={organisationName}
                      onChange={(e) => setOrganisationName(e.target.value)}
                      placeholder="e.g. GreenHarvest Partners Ltd"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    {role === 'Sponsor' && sponsorType === 'organisation'
                      ? 'Official Email Address *'
                      : 'Email Address *'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Password (minimum 8 characters) *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Phone Number with Country Code *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+2348012345678"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">Country *</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                  />
                </div>

                {!(role === 'Sponsor' && sponsorType === 'organisation') ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#243629]">
                        State {role === 'Sponsor' ? '/ Region' : '*'}
                      </label>
                      <input
                        type="text"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="e.g. Oyo State"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#243629]">
                        Local Government Area (LGA) *
                      </label>
                      <input
                        type="text"
                        value={lga}
                        onChange={(e) => setLga(e.target.value)}
                        placeholder="e.g. Iseyin LGA"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Office Address *
                    </label>
                    <input
                      type="text"
                      value={officeAddress}
                      onChange={(e) => setOfficeAddress(e.target.value)}
                      placeholder="Registered office street address"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    {role === 'Farmer'
                      ? 'Town or Farm Location *'
                      : role === 'Worker'
                        ? 'Town, City & Residential Location *'
                        : 'Town / City Location *'}
                  </label>
                  <input
                    type="text"
                    value={townOrLocation}
                    onChange={(e) => setTownOrLocation(e.target.value)}
                    placeholder="e.g. Ibadan, Ring Road"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-[#F5F8F3] p-4">
                  <label className="block text-xs font-semibold text-[#243629]">
                    {role === 'Sponsor' && sponsorType === 'organisation'
                      ? 'Company Logo (Optional)'
                      : 'Profile Picture'}
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#EAF6EC]">
                      <FileUp className="h-3.5 w-3.5 text-[#159B42]" />
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleFilePicked(
                            e,
                            role === 'Sponsor' && sponsorType === 'organisation'
                              ? setLogoUrl
                              : setProfilePicture,
                            true
                          )
                        }
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={
                        role === 'Sponsor' && sponsorType === 'organisation'
                          ? logoUrl
                          : profilePicture
                      }
                      onChange={(e) =>
                        role === 'Sponsor' && sponsorType === 'organisation'
                          ? setLogoUrl(e.target.value)
                          : setProfilePicture(e.target.value)
                      }
                      placeholder="Image filename or URL"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>

                {!(role === 'Sponsor' && sponsorType === 'organisation') && (
                  <div className="rounded-2xl border border-slate-200 bg-[#F5F8F3] p-4">
                    <label className="block text-xs font-semibold text-[#243629]">
                      Government-Issued ID Document (For Verification) *
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#EAF6EC]">
                        <FileUp className="h-3.5 w-3.5 text-[#159B42]" />
                        <span>Attach ID</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFilePicked(e, setGovernmentIdDocument)}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={governmentIdDocument}
                        onChange={(e) => setGovernmentIdDocument(e.target.value)}
                        placeholder="NIN / Voter Card / Passport filename"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ROLE-SPECIFIC SECTION 2 */}
            {role === 'Worker' && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <h2 className="text-sm font-bold text-[#243629]">
                  2. Worker Skills, Categories &amp; Wage Preferences
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Skills (comma-separated) *
                    </label>
                    <input
                      type="text"
                      value={skillsText}
                      onChange={(e) => setSkillsText(e.target.value)}
                      placeholder="e.g. Maize Harvesting, Drip Irrigation, Tractor Driving"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Experience Summary *
                    </label>
                    <input
                      type="text"
                      value={farmingExperience}
                      onChange={(e) => setFarmingExperience(e.target.value)}
                      placeholder="e.g. 4 years commercial crop harvesting"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Expected Wage (₦) *
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="number"
                        min="500"
                        value={expectedWageNaira}
                        onChange={(e) => setExpectedWageNaira(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm"
                      />
                      <select
                        value={wageUnit}
                        onChange={(e) => setWageUnit(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                      >
                        <option value="Per Day">Per Day</option>
                        <option value="Per Task">Per Task</option>
                        <option value="Weekly">Weekly</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Availability *
                    </label>
                    <input
                      type="text"
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      placeholder="e.g. Mon–Sat, Available immediately"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Types of Farm Work You Can Perform *
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {FARM_WORK_CATEGORIES.map((cat) => (
                      <label
                        key={cat}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                          selectedWorkTypes.includes(cat)
                            ? 'border-[#159B42] bg-[#EAF6EC] text-[#116B32]'
                            : 'border-slate-200 bg-white text-[#243629]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWorkTypes.includes(cat)}
                          onChange={() => toggleMulti(cat, selectedWorkTypes, setSelectedWorkTypes)}
                          className="accent-[#159B42]"
                        />
                        <span>{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Short Personal Description *
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Briefly describe your reliability, equipment familiarity, and work history..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Optional Supporting Documents
                  </label>
                  <input
                    type="text"
                    value={supportingDocsText}
                    onChange={(e) => setSupportingDocsText(e.target.value)}
                    placeholder="Comma-separated references or certificates (optional)"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {role === 'Farmer' && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <h2 className="text-sm font-bold text-[#243629]">
                  2. Farm Profile &amp; Agricultural Support Needs
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Farm Name *
                    </label>
                    <input
                      type="text"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      placeholder="e.g. Ogunleye Maize & Cassava Farm"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Farm Location *
                    </label>
                    <input
                      type="text"
                      value={farmLocation}
                      onChange={(e) => setFarmLocation(e.target.value)}
                      placeholder="e.g. Iseyin Road, Km 12, Oyo State"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Farming Type *
                    </label>
                    <select
                      value={farmingType}
                      onChange={(e) => setFarmingType(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                    >
                      <option value="Arable Crop Farming">Arable Crop Farming</option>
                      <option value="Mixed Crop & Livestock">Mixed Crop &amp; Livestock</option>
                      <option value="Livestock & Poultry">Livestock &amp; Poultry</option>
                      <option value="Horticulture & Tree Crops">Horticulture &amp; Tree Crops</option>
                      <option value="Aquaculture">Aquaculture</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Crops or Livestock *
                    </label>
                    <input
                      type="text"
                      value={cropsOrLivestock}
                      onChange={(e) => setCropsOrLivestock(e.target.value)}
                      placeholder="e.g. Yellow Maize, Cassava, Soybeans"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Farm Size *
                    </label>
                    <input
                      type="text"
                      value={farmSize}
                      onChange={(e) => setFarmSize(e.target.value)}
                      placeholder="e.g. 10 Hectares"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Years of Experience *
                    </label>
                    <input
                      type="text"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      placeholder="e.g. 8 Years"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Agricultural Support Needed
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {SUPPORT_CATEGORY_OPTIONS.map((item) => (
                      <label
                        key={item}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                          supportNeeded.includes(item)
                            ? 'border-[#159B42] bg-[#EAF6EC] text-[#116B32]'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={supportNeeded.includes(item)}
                          onChange={() => toggleMulti(item, supportNeeded, setSupportNeeded)}
                          className="accent-[#159B42]"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Farm Description *
                  </label>
                  <textarea
                    rows={3}
                    value={farmDescription}
                    onChange={(e) => setFarmDescription(e.target.value)}
                    placeholder="Describe current cultivation operations, land access, irrigation status, and goals..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Optional Farm Photographs
                    </label>
                    <input
                      type="text"
                      value={farmPhotoRef}
                      onChange={(e) => setFarmPhotoRef(e.target.value)}
                      placeholder="Filename or photo reference (optional)"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Optional Supporting Documents
                    </label>
                    <input
                      type="text"
                      value={supportingDocsText}
                      onChange={(e) => setSupportingDocsText(e.target.value)}
                      placeholder="Land title / cooperative proof (optional)"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {role === 'Supervisor' && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[#243629]">
                    2. Supervisor Qualifications &amp; Specialisations
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#116B32]">
                    <Lock className="h-3.5 w-3.5" />
                    Independent Monitor Role (No Admin Privileges)
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Professional Qualifications *
                    </label>
                    <input
                      type="text"
                      value={professionalQualifications}
                      onChange={(e) => setProfessionalQualifications(e.target.value)}
                      placeholder="e.g. B.Sc. Agriculture / Certified Project Monitor"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Agricultural Experience *
                    </label>
                    <input
                      type="text"
                      value={agriculturalExperience}
                      onChange={(e) => setAgriculturalExperience(e.target.value)}
                      placeholder="e.g. 6 Years Agronomy & Field Audits"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Previous Supervision Experience *
                    </label>
                    <input
                      type="text"
                      value={previousSupervisionExperience}
                      onChange={(e) => setPreviousSupervisionExperience(e.target.value)}
                      placeholder="e.g. Supervised 14 cooperative maize harvests"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Availability &amp; Service Locations *
                    </label>
                    <input
                      type="text"
                      value={availabilityLocations}
                      onChange={(e) => setAvailabilityLocations(e.target.value)}
                      placeholder="e.g. Oyo, Osun & Ogun States (Weekly Site Visits)"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Areas of Specialisation *
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SUPERVISOR_SPECIALISATIONS.map((spec) => (
                      <label
                        key={spec}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                          specialisations.includes(spec)
                            ? 'border-[#159B42] bg-[#EAF6EC] text-[#116B32]'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={specialisations.includes(spec)}
                          onChange={() => toggleMulti(spec, specialisations, setSpecialisations)}
                          className="accent-[#159B42]"
                        />
                        <span>{spec}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Short Professional Description *
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Summarise your inspection reporting discipline and neutrality..."
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Certifications or Supporting Documents
                    </label>
                    <textarea
                      rows={3}
                      value={certificationsText}
                      onChange={(e) => setCertificationsText(e.target.value)}
                      placeholder="Comma-separated certificates or references"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {role === 'Sponsor' && sponsorType === 'individual' && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <h2 className="text-sm font-bold text-[#243629]">
                  2. Individual Sponsor Focus &amp; Support Categories
                </h2>
                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Personal Sponsor Description *
                  </label>
                  <textarea
                    rows={3}
                    value={sponsorDescription}
                    onChange={(e) => setSponsorDescription(e.target.value)}
                    placeholder="Explain the types of farms and agricultural initiatives you want to support..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Areas of Agricultural Interest *
                    </label>
                    <input
                      type="text"
                      value={agriculturalInterestsText}
                      onChange={(e) => setAgriculturalInterestsText(e.target.value)}
                      placeholder="e.g. Maize, Cassava, Poultry, Irrigation"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Social Media or Profile Links (Optional)
                    </label>
                    <input
                      type="text"
                      value={socialMediaLinks}
                      onChange={(e) => setSocialMediaLinks(e.target.value)}
                      placeholder="LinkedIn or website URL"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Types of Support You Provide *
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {SUPPORT_CATEGORY_OPTIONS.map((item) => (
                      <label
                        key={item}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                          supportTypesProvided.includes(item)
                            ? 'border-[#159B42] bg-[#EAF6EC] text-[#116B32]'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={supportTypesProvided.includes(item)}
                          onChange={() =>
                            toggleMulti(item, supportTypesProvided, setSupportTypesProvided)
                          }
                          className="accent-[#159B42]"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {role === 'Sponsor' && sponsorType === 'organisation' && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <h2 className="text-sm font-bold text-[#243629]">
                  2. Organisation Details &amp; Authorised Representative
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Organisation Type *
                    </label>
                    <input
                      type="text"
                      value={organisationType}
                      onChange={(e) => setOrganisationType(e.target.value)}
                      placeholder="e.g. Agribusiness Company / Cooperative / Impact Fund"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Website (Optional)
                    </label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Representative&apos;s Full Name *
                    </label>
                    <input
                      type="text"
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      placeholder="Authorised officer name"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Representative&apos;s Position *
                    </label>
                    <input
                      type="text"
                      value={representativePosition}
                      onChange={(e) => setRepresentativePosition(e.target.value)}
                      placeholder="e.g. Programme Director"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Representative&apos;s ID Document *
                    </label>
                    <input
                      type="text"
                      value={representativeIdDocument}
                      onChange={(e) => setRepresentativeIdDocument(e.target.value)}
                      placeholder="e.g. NIN_Rep_Document.pdf"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Organisation Registration Documents *
                    </label>
                    <input
                      type="text"
                      value={registrationDocsText}
                      onChange={(e) => setRegistrationDocsText(e.target.value)}
                      placeholder="e.g. CAC_Certificate.pdf, Tax_ID.pdf"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#243629]">
                    Organisation Description *
                  </label>
                  <textarea
                    rows={3}
                    value={sponsorDescription}
                    onChange={(e) => setSponsorDescription(e.target.value)}
                    placeholder="Describe your agricultural funding criteria, geographic coverage, and support focus..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Agricultural Support Categories *
                    </label>
                    <input
                      type="text"
                      value={agriculturalInterestsText}
                      onChange={(e) => setAgriculturalInterestsText(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Types of Support Available *
                    </label>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {SUPPORT_CATEGORY_OPTIONS.map((item) => (
                        <label
                          key={item}
                          className="flex cursor-pointer items-center gap-1.5 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={supportTypesProvided.includes(item)}
                            onChange={() =>
                              toggleMulti(item, supportTypesProvided, setSupportTypesProvided)
                            }
                            className="accent-[#159B42]"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-emerald-900/15 bg-[#EAF6EC] p-4 text-xs text-[#116B32]">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#159B42]" />
                <p>
                  By creating this <strong>{role}</strong> account, your verification status begins
                  as <strong>Pending Verification</strong>. An authorised Admin reviewer verifies
                  submitted documents separately — uploading a file never automatically marks a
                  profile Verified.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#159B42] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-[#116B32] disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {submitting ? `Creating ${role} Account...` : `Complete ${role} Registration`}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

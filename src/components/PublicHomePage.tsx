import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Handshake,
  HelpCircle,
  Lock,
  Mail,
  ShieldCheck,
  Sprout,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { PublicUserRole } from '../types/farmfund';
import { ASSETS } from '../data/seedData';

interface PublicSummaryStats {
  registeredWorkersCount: number;
  registeredFarmersCount: number;
  registeredSupervisorsCount: number;
  registeredSponsorsCount: number;
  openJobsCount: number;
  activeSupportAgreementsCount: number;
}

interface PublicHomePageProps {
  onSelectRegisterRole: (role: PublicUserRole) => void;
  onOpenSignIn: (mode?: 'public' | 'admin') => void;
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({
  onSelectRegisterRole,
  onOpenSignIn,
}) => {
  const [summary, setSummary] = useState<PublicSummaryStats | null>(null);
  const [infoModal, setInfoModal] = useState<'privacy' | 'terms' | 'help' | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/platform/public-summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PublicSummaryStats | null) => {
        if (active && data) setSummary(data);
      })
      .catch(() => {
        // Silent fail — never fabricate fake metrics
      });
    return () => {
      active = false;
    };
  }, []);

  const hasVerifiedLiveActivity =
    summary !== null &&
    summary.registeredWorkersCount +
      summary.registeredFarmersCount +
      summary.registeredSupervisorsCount +
      summary.registeredSponsorsCount >
      0;

  return (
    <div className="min-h-screen bg-[#F5F8F3] text-[#243629]">
      {/* Zone 1 / 2 / 3 Header */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
          <a
            href="#top"
            className="font-display text-2xl font-bold tracking-tight text-[#116B32] whitespace-nowrap shrink-0"
          >
            FarmFund
          </a>

          <nav
            aria-label="Homepage Navigation"
            className="hidden items-center gap-6 text-sm font-semibold text-[#718071] md:flex"
          >
            <a
              href="#how-it-works"
              className="transition-colors duration-200 hover:text-[#116B32] whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#join-farmfund"
              className="transition-colors duration-200 hover:text-[#116B32] whitespace-nowrap shrink-0"
            >
              Join FarmFund
            </a>
            <a
              href="#opportunities"
              className="transition-colors duration-200 hover:text-[#116B32] whitespace-nowrap shrink-0"
            >
              Opportunities
            </a>
            <a
              href="#contact-support"
              className="transition-colors duration-200 hover:text-[#116B32] whitespace-nowrap shrink-0"
            >
              Support
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenSignIn('public')}
              className="rounded-xl border border-emerald-900/20 bg-white px-4 py-2 text-xs font-bold text-[#243629] transition-colors duration-200 hover:bg-[#EAF6EC] whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
            <a
              href="#join-farmfund"
              className="rounded-xl bg-[#159B42] px-4 py-2 text-xs font-bold text-white shadow-2xs transition-colors duration-200 hover:bg-[#116B32] whitespace-nowrap shrink-0"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        {/* A. HERO SECTION */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#116B32]">
                <Sprout className="h-4 w-4 text-[#159B42]" />
                <span>Agricultural Support · Farm Employment · Project Supervision</span>
              </div>

              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#243629] sm:text-5xl">
                Connecting Farmers, Workers and Sponsors to Grow Agriculture.
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-[#718071] sm:text-lg">
                FarmFund brings farmers, skilled workers, supervisors and sponsors together to make
                agricultural support, farm employment and project supervision easier, safer and
                more transparent.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <a
                  href="#join-farmfund"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#159B42] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#116B32]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => onOpenSignIn('public')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-900/20 bg-white px-6 py-3.5 text-sm font-bold text-[#243629] transition-all duration-200 hover:bg-[#EAF6EC]"
                >
                  <span>Sign In</span>
                </button>
              </div>

              {/* Honest Live Summary — Never displays fake numbers when database is empty */}
              <div className="rounded-2xl border border-emerald-900/10 bg-white p-4">
                {hasVerifiedLiveActivity && summary ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-semibold text-[#718071]">Registered Workers</p>
                      <p className="mt-0.5 font-mono text-lg font-bold text-[#116B32] tabular-nums">
                        {summary.registeredWorkersCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[#718071]">Registered Farmers</p>
                      <p className="mt-0.5 font-mono text-lg font-bold text-[#116B32] tabular-nums">
                        {summary.registeredFarmersCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[#718071]">Supervisors</p>
                      <p className="mt-0.5 font-mono text-lg font-bold text-[#116B32] tabular-nums">
                        {summary.registeredSupervisorsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[#718071]">Registered Sponsors</p>
                      <p className="mt-0.5 font-mono text-lg font-bold text-[#116B32] tabular-nums">
                        {summary.registeredSponsorsCount}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 text-xs text-[#718071]">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#159B42]" />
                    <p>
                      <strong className="text-[#243629]">Verified Live Platform Activity:</strong>{' '}
                      No simulated user counts or artificial job numbers are displayed here. Choose
                      your account role below to create a verified FarmFund workspace.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-white p-2.5 shadow-sm">
                <img
                  src={ASSETS.heroHarvest}
                  alt="Nigerian farmers collaborating during grain harvest season"
                  className="h-72 w-full rounded-2xl object-cover sm:h-96"
                />
                <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-[#EAF6EC] px-3 py-2">
                    <p className="text-[11px] font-bold text-[#116B32]">Worker</p>
                    <p className="text-[11px] text-[#243629]">Direct 100% Wages</p>
                  </div>
                  <div className="rounded-xl bg-[#EAF6EC] px-3 py-2">
                    <p className="text-[11px] font-bold text-[#116B32]">Farmer</p>
                    <p className="text-[11px] text-[#243629]">Farm Support &amp; Crew</p>
                  </div>
                  <div className="rounded-xl bg-[#EAF6EC] px-3 py-2">
                    <p className="text-[11px] font-bold text-[#116B32]">Supervisor</p>
                    <p className="text-[11px] text-[#243629]">Field Verification</p>
                  </div>
                  <div className="rounded-xl bg-[#EAF6EC] px-3 py-2">
                    <p className="text-[11px] font-bold text-[#116B32]">Sponsor</p>
                    <p className="text-[11px] text-[#243629]">Support &amp; Escrow</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* B. HOW FARMFUND WORKS (FOUR DISTINCT ROLE CARDS) */}
        <section id="how-it-works" className="border-t border-emerald-900/10 bg-white py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#159B42]">
                How FarmFund Works
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#243629] sm:text-3xl">
                Four connected agricultural roles with clear boundaries
              </h2>
              <p className="mt-2 text-sm text-[#718071]">
                Every user registers directly into their primary role and enters a tailored
                workspace designed strictly around their agricultural responsibilities.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-900/10 bg-[#F5F8F3] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#159B42] text-white">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#243629]">Farm Workers</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#718071]">
                  Browse verified agricultural jobs by location, category, and wage rate. Apply
                  directly and receive agreed wages with 0% sponsor deduction.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-900/10 bg-[#F5F8F3] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#116B32] text-white">
                  <Sprout className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#243629]">Farmers</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#718071]">
                  Discover individual or corporate sponsors, request financial or input support
                  under explicit terms, and hire skilled farm workers cleanly.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-900/10 bg-[#F5F8F3] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#243629] text-white">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#243629]">Supervisors</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#718071]">
                  Accept project supervision invitations on active agreements, inspect farm sites,
                  document progress evidence, and recommend project completion.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-900/10 bg-[#F5F8F3] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#159B42] text-white">
                  <Handshake className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#243629]">Sponsors</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#718071]">
                  Register as an Individual or Organisation Sponsor to review farmer requests, send
                  support offers, hire workers, and fund projects via Stellar USDC escrow.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* C. CHOOSE HOW TO JOIN FARMFUND — PROMINENT FOUR-ROLE REGISTRATION SECTION */}
        <section id="join-farmfund" className="bg-[#EAF6EC] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#116B32]">
                Choose How To Join FarmFund
              </span>
              <h2 className="mt-1.5 font-display text-3xl font-bold text-[#243629] sm:text-4xl">
                Select your role before registration begins
              </h2>
              <p className="mt-2.5 text-sm text-[#718071]">
                Each registration button opens a dedicated onboarding form built specifically for
                that role&apos;s documents, profile requirements, and dashboard permissions.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* 1. WORKER CARD */}
              <div className="flex flex-col justify-between rounded-3xl border border-emerald-900/15 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#159B42]">
                      01 · Worker
                    </span>
                    <Briefcase className="h-5 w-5 text-[#159B42]" />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold text-[#243629]">Worker</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#718071]">
                    Find available farm jobs, apply for work and receive payments for completed
                    tasks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectRegisterRole('Worker')}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#159B42] px-4 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#116B32]"
                >
                  <span>Register as a Worker</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* 2. FARMER CARD */}
              <div className="flex flex-col justify-between rounded-3xl border border-emerald-900/15 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#159B42]">
                      02 · Farmer
                    </span>
                    <Sprout className="h-5 w-5 text-[#159B42]" />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold text-[#243629]">Farmer</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#718071]">
                    Connect with sponsors, request agricultural support and access workers for your
                    farm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectRegisterRole('Farmer')}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#159B42] px-4 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#116B32]"
                >
                  <span>Register as a Farmer</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* 3. SUPERVISOR CARD */}
              <div className="flex flex-col justify-between rounded-3xl border border-emerald-900/15 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#159B42]">
                      03 · Supervisor
                    </span>
                    <ClipboardCheck className="h-5 w-5 text-[#159B42]" />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold text-[#243629]">Supervisor</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#718071]">
                    Oversee agricultural projects and monitor work agreements between sponsors,
                    farmers and workers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectRegisterRole('Supervisor')}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#159B42] px-4 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#116B32]"
                >
                  <span>Register as a Supervisor</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* 4. SPONSOR CARD */}
              <div className="flex flex-col justify-between rounded-3xl border border-emerald-900/15 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#159B42]">
                      04 · Sponsor
                    </span>
                    <Handshake className="h-5 w-5 text-[#159B42]" />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold text-[#243629]">Sponsor</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#718071]">
                    Discover farmers and workers, provide support, hire people and monitor
                    agricultural projects.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectRegisterRole('Sponsor')}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#159B42] px-4 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#116B32]"
                >
                  <span>Register as a Sponsor</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* D. ABOUT FARMFUND, PLATFORM PROCESS, OPPORTUNITIES & DEEP WORKFLOW GUIDES */}
        <section id="opportunities" className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
          {/* About FarmFund + Why Use FarmFund */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-4 rounded-3xl border border-emerald-900/10 bg-white p-7 lg:col-span-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#159B42]">
                About FarmFund
              </span>
              <h2 className="font-display text-2xl font-bold text-[#243629]">
                Transparent coordination across inputs, labour, and harvest verification
              </h2>
              <p className="text-sm leading-relaxed text-[#718071]">
                FarmFund was structured to eliminate confusion between agricultural financing
                partnerships and direct farm labour wages. Whether supporting seed supply,
                equipment access, irrigation setup, or hiring harvest crews, every commitment is
                explicitly reviewed, accepted by the named parties, and tracked cleanly.
              </p>
              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#F5F8F3] p-4">
                  <p className="text-xs font-bold text-[#116B32]">Verified Onboarding</p>
                  <p className="mt-1 text-xs text-[#718071]">
                    All accounts undergo manual identity review (`Pending Verification` until
                    approved).
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F5F8F3] p-4">
                  <p className="text-xs font-bold text-[#116B32]">Embedded Stellar Wallets</p>
                  <p className="mt-1 text-xs text-[#718071]">
                    Eligible users receive an embedded Stellar USDC wallet without needing external
                    browser extensions.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-emerald-900/10 bg-white p-7 lg:col-span-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#159B42]">
                Why Use FarmFund
              </span>
              <h2 className="font-display text-2xl font-bold text-[#243629]">
                Built for trust, role separation, and fair compensation
              </h2>
              <ul className="space-y-3 text-sm text-[#718071]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#159B42]" />
                  <span>
                    <strong className="text-[#243629]">Strict Role Isolation:</strong> Workers,
                    Farmers, Supervisors, and Sponsors only access features designed for their role.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#159B42]" />
                  <span>
                    <strong className="text-[#243629]">Explicit Dual-Party Agreements:</strong>{' '}
                    Terms—including any optional 30% produce or proceeds share—must be openly
                    reviewed and accepted by both sides.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#159B42]" />
                  <span>
                    <strong className="text-[#243629]">100% Protected Worker Wages:</strong> Labour
                    wages are settled directly with 0% sponsor share deduction.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#159B42]" />
                  <span>
                    <strong className="text-[#243629]">Assigned Field Supervision:</strong>{' '}
                    Independent supervisors only monitor accepted projects they are invited and
                    assigned to inspect.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* 3 Visual Workflow Guides: Sponsors Supporting Farmers · Workers Finding Jobs · Supervisors Monitoring */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <article className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-white">
              <img
                src={ASSETS.sponsorPartnership}
                alt="Agricultural sponsor and farm owners collaborating at harvest"
                className="h-44 w-full object-cover"
              />
              <div className="p-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#159B42]">
                  Agricultural Opportunities &amp; Support
                </span>
                <h3 className="mt-1.5 font-display text-lg font-bold text-[#243629]">
                  How Sponsors Support Farmers
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#718071]">
                  Sponsors review verified farmer profiles and incoming support requests covering
                  funding, certified seeds, fertiliser, irrigation, or machinery, propose explicit
                  terms, and optionally lock USDC in Soroban escrow.
                </p>
              </div>
            </article>

            <article className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-white">
              <img
                src={ASSETS.workersHarvest}
                alt="Farm workers engaged in crop harvesting activities"
                className="h-44 w-full object-cover"
              />
              <div className="p-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#159B42]">
                  Farm Employment Marketplace
                </span>
                <h3 className="mt-1.5 font-display text-lg font-bold text-[#243629]">
                  How Workers Find Jobs
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#718071]">
                  Skilled workers filter active farm tasks across 13 categories—from land
                  preparation to tractor operation—apply with their availability, communicate with
                  hirers, and receive wages directly upon work confirmation.
                </p>
              </div>
            </article>

            <article className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-white">
              <img
                src={ASSETS.supervisorInspection}
                alt="Field supervisor inspecting maize crop progress with tablet"
                className="h-44 w-full object-cover"
              />
              <div className="p-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#159B42]">
                  Project Oversight
                </span>
                <h3 className="mt-1.5 font-display text-lg font-bold text-[#243629]">
                  How Supervisors Monitor Projects
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#718071]">
                  Agronomists and field supervisors accept supervision invitations from project
                  parties, upload verified field inspection photos and delay alerts, and record
                  completion observations without accessing or controlling other users&apos; funds.
                </p>
              </div>
            </article>
          </div>

          {/* Contact & Support */}
          <section
            id="contact-support"
            className="rounded-3xl border border-emerald-900/15 bg-white p-7 sm:p-9"
          >
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-[#159B42]">
                  Contact &amp; Support
                </span>
                <h2 className="mt-1 font-display text-2xl font-bold text-[#243629]">
                  Need assistance with verification or onboarding?
                </h2>
                <p className="mt-2 text-sm text-[#718071]">
                  Reach the FarmFund onboarding desk for government ID verification enquiries,
                  organisation sponsor setup, or Stellar Testnet wallet guidance.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="mailto:support@farmfund.ng"
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-900/20 bg-[#F5F8F3] px-4 py-2.5 text-xs font-bold text-[#243629] hover:bg-[#EAF6EC]"
                >
                  <Mail className="h-4 w-4 text-[#159B42]" />
                  <span>support@farmfund.ng</span>
                </a>
                <button
                  type="button"
                  onClick={() => setInfoModal('help')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#159B42] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#116B32]"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>View Platform Guide</span>
                </button>
              </div>
            </div>
          </section>
        </section>
      </main>

      {/* Footer with Privacy Policy, Terms, Help & Protected Admin Access */}
      <footer className="border-t border-emerald-900/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-[#718071] sm:px-6 lg:px-8">
          <div>
            <span className="font-display text-base font-bold text-[#116B32]">FarmFund</span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span>Connecting Farmers, Workers, Supervisors &amp; Sponsors</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-semibold">
            <button
              type="button"
              onClick={() => setInfoModal('privacy')}
              className="hover:text-[#116B32]"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setInfoModal('terms')}
              className="hover:text-[#116B32]"
            >
              Terms of Agreement
            </button>
            <button
              type="button"
              onClick={() => setInfoModal('help')}
              className="hover:text-[#116B32]"
            >
              Help Centre
            </button>
            <button
              type="button"
              onClick={() => onOpenSignIn('admin')}
              className="inline-flex items-center gap-1 text-[#718071] hover:text-[#243629]"
            >
              <Lock className="h-3 w-3" />
              <span>Admin Access</span>
            </button>
          </div>
        </div>
      </footer>

      {infoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-[#243629]">
                {infoModal === 'privacy'
                  ? 'FarmFund Privacy Policy'
                  : infoModal === 'terms'
                    ? 'FarmFund Terms & Agreement Rules'
                    : 'FarmFund Platform Help'}
              </h3>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2.5 text-xs leading-relaxed text-[#718071]">
              {infoModal === 'privacy' && (
                <>
                  <p>
                    Identity documents submitted during Worker, Farmer, Supervisor, and Sponsor
                    registration are accessible only to you and authorised FarmFund verification
                    reviewers.
                  </p>
                  <p>
                    Supervisors only view project agreements after acceptance by the main parties
                    and explicit invitation or assignment. Direct messages are restricted strictly
                    to conversation participants.
                  </p>
                </>
              )}
              {infoModal === 'terms' && (
                <>
                  <p>
                    Primary account roles are assigned at registration and cannot be changed by
                    users themselves. Agricultural support terms—including any optional 30% produce
                    or proceeds share—require mutual explicit acceptance.
                  </p>
                  <p>
                    Direct farm worker wages are completely separate from sponsor agreements and
                    carry 0% sponsor deduction.
                  </p>
                </>
              )}
              {infoModal === 'help' && (
                <>
                  <p>
                    <strong className="text-[#243629]">Workers:</strong> Register as a Worker to
                    browse jobs, apply, track applications, message hirers, and receive wages.
                  </p>
                  <p>
                    <strong className="text-[#243629]">Farmers:</strong> Register as a Farmer to
                    connect with sponsors, request support, hire workers, and request project
                    supervision.
                  </p>
                  <p>
                    <strong className="text-[#243629]">Supervisors:</strong> Register as a
                    Supervisor to accept invitations and file inspection &amp; completion reports.
                  </p>
                  <p>
                    <strong className="text-[#243629]">Sponsors:</strong> Register as an Individual
                    or Organisation Sponsor to back farmers, post jobs, and manage Stellar escrows.
                  </p>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="rounded-xl bg-[#159B42] px-4 py-2 text-xs font-bold text-white hover:bg-[#116B32]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

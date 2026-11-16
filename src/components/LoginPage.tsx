import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, Lock, Mail, Sprout, Terminal } from 'lucide-react';
import { UserRole } from '../types/farmfund';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole, displayName?: string, userId?: string) => void;
  onGoogleLogin: (role: UserRole) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onGoogleLogin,
}) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDevCodeMode, setIsDevCodeMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'Farmer' | 'Worker' | 'Sponsor' | 'Company'>(
    'Farmer'
  );
  const [email, setEmail] = useState('adewale@ogunleyefarms.ng');
  const [password, setPassword] = useState('••••••••••••');
  const [adminCode, setAdminCode] = useState('FF-ADMIN-2026');
  const [fullName, setFullName] = useState('Adewale Ogunleye');
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Development Account Code Auth State (FAMAD01, FAMER01, SPON01, COMP01)
  const [devCode, setDevCode] = useState<'FAMAD01' | 'FAMER01' | 'SPON01' | 'COMP01'>('FAMER01');
  const [devPassword, setDevPassword] = useState('');
  const [devNewPassword, setDevNewPassword] = useState('');
  const [pendingPasswordResetAccount, setPendingPasswordResetAccount] = useState<{
    accountCode: string;
    role: UserRole;
    displayName: string;
    userId: string;
  } | null>(null);
  const [devBusy, setDevBusy] = useState(false);

  const handleSelectPortal = (role: 'Farmer' | 'Worker' | 'Sponsor' | 'Company') => {
    setIsAdminMode(false);
    setIsDevCodeMode(false);
    setSelectedRole(role);
    setErrorMsg(null);
    if (role === 'Farmer') {
      setFullName('Adewale Ogunleye');
      setEmail('adewale@ogunleyefarms.ng');
    } else if (role === 'Worker') {
      setFullName('Musa Danjuma');
      setEmail('musa.danjuma@farmworkers.ng');
    } else if (role === 'Sponsor') {
      setFullName('Chukwuma Okafor');
      setEmail('chukwuma@sponsors.ng');
    } else {
      setFullName('AgroVanguard Capital NG');
      setEmail('investments@agrovanguard.ng');
    }
  };

  const handleToggleAdminMode = () => {
    const next = !isAdminMode;
    setIsAdminMode(next);
    setIsDevCodeMode(false);
    setIsRegistering(false);
    setErrorMsg(null);
    if (next) {
      setFullName('FarmFund Chief Administrator');
      setEmail('blessedogle52@gmail.com');
      setAdminCode('FF-ADMIN-2026');
    } else {
      handleSelectPortal('Farmer');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email address and password to continue.');
      return;
    }
    if (isAdminMode) {
      if (!adminCode.trim()) {
        setErrorMsg('Please enter your unique Admin Access Key.');
        return;
      }
      onLoginSuccess('Admin', fullName.trim() || 'FarmFund Admin', 'admin_oversight_1');
      return;
    }

    const defaultUserId =
      selectedRole === 'Farmer'
        ? 'demo_farmer_1'
        : selectedRole === 'Worker'
        ? 'worker_musa_1'
        : selectedRole === 'Company'
        ? 'company_agrovanguard_1'
        : 'demo_sponsor_1';

    onLoginSuccess(selectedRole, fullName.trim() || 'Adewale Ogunleye', defaultUserId);
  };

  const handleDevCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setDevBusy(true);
    try {
      const res = await fetch('/api/stellar/auth/dev-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountCode: devCode,
          password: devPassword,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        accountCode?: string;
        userId?: string;
        role?: UserRole;
        displayName?: string;
        mustChangePasswordOnFirstLogin?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Development account authentication failed.');
      }

      if (data.mustChangePasswordOnFirstLogin && data.accountCode && data.role && data.userId) {
        setPendingPasswordResetAccount({
          accountCode: data.accountCode,
          role: data.role,
          displayName: data.displayName || data.accountCode,
          userId: data.userId,
        });
        return;
      }

      onLoginSuccess(
        data.role || 'Farmer',
        data.displayName || devCode,
        data.userId || `dev_${devCode.toLowerCase()}`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setDevBusy(false);
    }
  };

  const handleCompleteFirstLoginPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPasswordResetAccount) return;
    setErrorMsg(null);
    setDevBusy(true);
    try {
      const res = await fetch('/api/stellar/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountCode: pendingPasswordResetAccount.accountCode,
          newPassword: devNewPassword,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }
      onLoginSuccess(
        pendingPasswordResetAccount.role,
        pendingPasswordResetAccount.displayName,
        pendingPasswordResetAccount.userId
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Password change failed.');
    } finally {
      setDevBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50/50 to-slate-50 flex flex-col justify-between">
      {/* Top Minimal Brand Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#159B42] text-white shadow-xs">
            <Sprout className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-slate-900">
            FarmFund
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsDevCodeMode(!isDevCodeMode);
              setIsAdminMode(false);
              setPendingPasswordResetAccount(null);
              setErrorMsg(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              isDevCodeMode
                ? 'border-[#159B42] bg-[#EAF6EC] text-[#116B32]'
                : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>{isDevCodeMode ? 'Standard Login' : 'Dev Account Codes'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleAdminMode}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
              isAdminMode
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>{isAdminMode ? 'Exit Admin Login' : 'Admin Login'}</span>
          </button>
        </div>
      </header>

      {/* Main Centered Login Card */}
      <main className="mx-auto my-auto w-full max-w-xl px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-6 shadow-xl backdrop-blur-md sm:p-10">
          {isDevCodeMode ? (
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#116B32]">
                <Terminal className="h-3.5 w-3.5" />
                <span>Server-Validated Development Account Codes</span>
              </span>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                {pendingPasswordResetAccount
                  ? `First-Login Password Update (${pendingPasswordResetAccount.accountCode})`
                  : 'Sign In with Dev Account Code'}
              </h1>
              <p className="mt-1.5 text-xs text-slate-600">
                Supported codes: <code className="font-mono font-bold">FAMAD01</code> (Admin),{' '}
                <code className="font-mono font-bold">FAMER01</code> (Farmer),{' '}
                <code className="font-mono font-bold">SPON01</code> (Individual Sponsor),{' '}
                <code className="font-mono font-bold">COMP01</code> (Company/Organisation).
              </p>

              {errorMsg && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
                >
                  {errorMsg}
                </div>
              )}

              {pendingPasswordResetAccount ? (
                <form onSubmit={handleCompleteFirstLoginPasswordChange} className="mt-5 space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-[#EAF6EC] p-3.5 text-xs text-[#116B32]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-[#159B42]" />
                      <span>First-Login Security Policy</span>
                    </div>
                    <p className="mt-1">
                      Please set a new personal password (minimum 8 characters) to complete your
                      first sign-in and provision your embedded Stellar Testnet wallet.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="dev-new-password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      New Account Password *
                    </label>
                    <input
                      id="dev-new-password"
                      type="password"
                      required
                      minLength={8}
                      value={devNewPassword}
                      onChange={(e) => setDevNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={devBusy}
                    className="w-full rounded-xl bg-[#159B42] py-3 text-sm font-bold text-white hover:bg-[#116B32]"
                  >
                    {devBusy
                      ? 'Updating Password...'
                      : `Update Password & Open ${pendingPasswordResetAccount.role} Wallet`}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleDevCodeSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Select Development Account Code
                    </label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {(['FAMER01', 'SPON01', 'COMP01', 'FAMAD01'] as const).map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setDevCode(code)}
                          className={`rounded-xl border py-2.5 font-mono text-xs font-bold transition-all ${
                            devCode === code
                              ? 'border-[#159B42] bg-[#EAF6EC] text-[#116B32]'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="dev-code-password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Server Environment Password
                    </label>
                    <input
                      id="dev-code-password"
                      type="password"
                      required
                      value={devPassword}
                      onChange={(e) => setDevPassword(e.target.value)}
                      placeholder="Enter server-configured temporary password"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={devBusy}
                    className="w-full rounded-xl bg-[#159B42] py-3 text-sm font-bold text-white hover:bg-[#116B32]"
                  >
                    {devBusy ? 'Verifying with Server...' : `Authenticate ${devCode}`}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              {isAdminMode ? (
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Dedicated Administrator Authentication</span>
                  </span>
                  <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                    Unique Admin Portal Login
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Sign in with your authorised administrator email and security key to access the
                    FarmFund Admin Dashboard.
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-xs font-semibold text-emerald-700">
                    Welcome to FarmFund
                  </span>
                  <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                    {isRegistering ? 'Create Your FarmFund Account' : 'Sign In to Your Account'}
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Choose between the merged Farmer &amp; Worker workspace or the dedicated Sponsor
                    &amp; Company portal. Every account includes an embedded Stellar Testnet wallet.
                  </p>
                </div>
              )}

              {/* Public Portal Selector */}
              {!isAdminMode && (
                <div className="mt-6">
                  <label className="block text-xs font-semibold text-slate-700">
                    Select Account Role &amp; Embedded Wallet Type
                  </label>
                  <div
                    role="group"
                    aria-label="Select Account Role"
                    className="mt-2 grid grid-cols-2 gap-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectPortal('Farmer')}
                      className={`flex flex-col items-start rounded-2xl border-2 p-3.5 text-left transition-all ${
                        selectedRole === 'Farmer'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                          : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="text-sm font-bold text-slate-900">
                        Farmer &amp; Worker Portal
                      </span>
                      <span className="mt-0.5 text-[11px] text-slate-500">
                        Support requests, field jobs &amp; Stellar USDC wallet
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPortal('Sponsor')}
                      className={`flex flex-col items-start rounded-2xl border-2 p-3.5 text-left transition-all ${
                        selectedRole === 'Sponsor'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                          : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="text-sm font-bold text-slate-900">
                        Sponsor Portal
                      </span>
                      <span className="mt-0.5 text-[11px] text-slate-500">
                        Upload requests, 30% sponsorships &amp; Soroban escrow
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPortal('Worker')}
                      className={`flex flex-col items-start rounded-2xl border-2 p-3 text-left transition-all ${
                        selectedRole === 'Worker'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                          : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900">
                        Farm Worker Account
                      </span>
                      <span className="mt-0.5 text-[11px] text-slate-500">
                        100% direct wages (0% sponsor share)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPortal('Company')}
                      className={`flex flex-col items-start rounded-2xl border-2 p-3 text-left transition-all ${
                        selectedRole === 'Company'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                          : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900">
                        Company / Organisation
                      </span>
                      <span className="mt-0.5 text-[11px] text-slate-500">
                        Multi-signatory corporate wallet
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Credentials Form */}
              <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
                  >
                    {errorMsg}
                  </div>
                )}

                {isRegistering && !isAdminMode && (
                  <div>
                    <label
                      htmlFor="login-fullname"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Full Name or Organisation
                    </label>
                    <input
                      id="login-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    {isAdminMode ? 'Administrator Email' : 'Email Address'}
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {isAdminMode && (
                  <div>
                    <label
                      htmlFor="login-admin-key"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Unique Admin Access Key
                    </label>
                    <div className="relative mt-1.5">
                      <KeyRound className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                      <input
                        id="login-admin-key"
                        type="text"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        placeholder="FF-ADMIN-2026"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-3.5 pl-10 font-mono text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-xs transition-all active:scale-[0.99] ${
                      isAdminMode
                        ? 'bg-slate-900 hover:bg-slate-800'
                        : selectedRole === 'Sponsor' || selectedRole === 'Company'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-[#159B42] hover:bg-[#116B32]'
                    }`}
                  >
                    <span>
                      {isAdminMode
                        ? 'Sign In to Admin Dashboard'
                        : isRegistering
                        ? `Register & Provision ${selectedRole} Stellar Wallet`
                        : `Sign In as ${selectedRole}`}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void onGoogleLogin(isAdminMode ? 'Admin' : selectedRole)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <span>Sign In with Google</span>
                  </button>
                </div>
              </form>

              {!isAdminMode && (
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-600">
                  <span>
                    {isRegistering ? 'Already have a FarmFund account?' : 'New to FarmFund Nigeria?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="font-semibold text-[#159B42] hover:underline"
                  >
                    {isRegistering ? 'Switch to Sign In' : 'Create an Account'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-4 text-center text-xs text-slate-500">
        FarmFund Platform · Embedded Stellar Testnet &amp; Circle USDC Settlement · Subject to
        Nigerian agricultural legal and regulatory review.
      </footer>
    </div>
  );
};

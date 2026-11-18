import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import type { PlatformUser, PublicUserRole, SponsorType, UserRole } from '../types/farmfund';

interface LoginModalProps {
  initialMode?: 'public' | 'admin';
  onBackToHome: () => void;
  onGoToRoleRegistration: (role: PublicUserRole) => void;
  onAuthenticated: (user: PlatformUser, snapshot: Record<string, unknown>) => void;
  onGoogleLogin: (role: PublicUserRole) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  initialMode = 'public',
  onBackToHome,
  onGoToRoleRegistration,
  onAuthenticated,
  onGoogleLogin,
}) => {
  const [loginMethod, setLoginMethod] = useState<'email' | 'code'>(
    initialMode === 'admin' ? 'code' : 'email'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Account Code Auth (FAMAD01, WORK01, FAMER01, SUPV01, SPON01, COMP01)
  const [accountCode, setAccountCode] = useState(initialMode === 'admin' ? 'FAMAD01' : '');
  const [codePassword, setCodePassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [pendingCode, setPendingCode] = useState('');
  const [pendingUser, setPendingUser] = useState<PlatformUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [googleRole, setGoogleRole] = useState<PublicUserRole>('Farmer');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as {
        error?: string;
        user?: PlatformUser;
        snapshot?: Record<string, unknown>;
      };
      if (!res.ok || !data.user || !data.snapshot) {
        throw new Error(data.error || 'Invalid credentials.');
      }
      onAuthenticated(data.user, data.snapshot);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCodeSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!accountCode.trim() || !codePassword.trim()) {
      setErrorMsg('Enter your account code and password.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/stellar/auth/dev-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountCode: accountCode.trim().toUpperCase(),
          password: codePassword,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        accountCode?: string;
        userId?: string;
        role?: UserRole;
        sponsorType?: SponsorType;
        mustChangePasswordOnFirstLogin?: boolean;
        user?: PlatformUser;
      };
      if (!res.ok || !data.userId || !data.role || !data.user) {
        throw new Error(data.error || 'Account authentication failed.');
      }

      if (data.mustChangePasswordOnFirstLogin) {
        setPendingCode(data.accountCode || accountCode.trim().toUpperCase());
        setPendingUser(data.user);
        setMustChangePassword(true);
        setBusy(false);
        return;
      }

      const snapRes = await fetch(
        `/api/platform/state?userId=${encodeURIComponent(data.userId)}`
      );
      const snapData = (await snapRes.json()) as {
        user: PlatformUser;
        snapshot: Record<string, unknown>;
      };
      onAuthenticated(snapData.user || data.user, snapData.snapshot || {});
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Account sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteFirstLoginPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/stellar/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountCode: pendingCode, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Unable to update password.');
      }
      if (pendingUser) {
        const snapRes = await fetch(
          `/api/platform/state?userId=${encodeURIComponent(pendingUser.id)}`
        );
        const snapData = (await snapRes.json()) as {
          user: PlatformUser;
          snapshot: Record<string, unknown>;
        };
        onAuthenticated(snapData.user || pendingUser, snapData.snapshot || {});
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Password change failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8F3] px-4 py-10 text-[#243629] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl space-y-6">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#243629] hover:bg-[#EAF6EC]"
        >
          <ArrowLeft className="h-4 w-4 text-[#159B42]" />
          <span>Back to FarmFund Homepage</span>
        </button>

        <div className="rounded-3xl border border-emerald-900/15 bg-white p-6 shadow-sm sm:p-8">
          <div className="border-b border-slate-100 pb-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#159B42]">
              FarmFund Role-Routed Authentication
            </span>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#243629]">
              {mustChangePassword ? 'Required Password Update' : 'Sign In to FarmFund'}
            </h1>
            <p className="mt-1 text-xs text-[#718071]">
              Upon sign in, you are routed automatically to your registered role dashboard.
            </p>
          </div>

          {!mustChangePassword ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-[#F5F8F3] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('email');
                    setErrorMsg(null);
                  }}
                  className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                    loginMethod === 'email'
                      ? 'bg-[#159B42] text-white'
                      : 'text-[#718071] hover:text-[#243629]'
                  }`}
                >
                  Email &amp; Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('code');
                    setErrorMsg(null);
                  }}
                  className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                    loginMethod === 'code'
                      ? 'bg-[#159B42] text-white'
                      : 'text-[#718071] hover:text-[#243629]'
                  }`}
                >
                  Account Code / Admin
                </button>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-900"
                >
                  {errorMsg}
                </div>
              )}

              {loginMethod === 'email' ? (
                <form onSubmit={handleEmailSignIn} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Email Address
                    </label>
                    <div className="relative mt-1">
                      <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-[#718071]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm focus:border-[#159B42] focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">Password</label>
                    <div className="relative mt-1">
                      <Lock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-[#718071]" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm focus:border-[#159B42] focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-2xl bg-[#159B42] py-3 text-sm font-bold text-white transition-colors hover:bg-[#116B32] disabled:opacity-50"
                  >
                    {busy ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCodeSignIn} className="mt-5 space-y-4">
                  <div className="rounded-xl border border-emerald-900/10 bg-[#F5F8F3] p-3 text-[11px] text-[#718071]">
                    Enter your assigned account code (e.g.{' '}
                    <span className="font-mono font-bold text-[#243629]">WORK01</span>,{' '}
                    <span className="font-mono font-bold text-[#243629]">FAMER01</span>,{' '}
                    <span className="font-mono font-bold text-[#243629]">SUPV01</span>,{' '}
                    <span className="font-mono font-bold text-[#243629]">SPON01</span>,{' '}
                    <span className="font-mono font-bold text-[#243629]">COMP01</span>, or Admin{' '}
                    <span className="font-mono font-bold text-[#243629]">FAMAD01</span>). First-time
                    access enforces an immediate password change.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">
                      Account Code
                    </label>
                    <input
                      type="text"
                      value={accountCode}
                      onChange={(e) => setAccountCode(e.target.value)}
                      placeholder="e.g. FAMAD01"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm uppercase focus:border-[#159B42] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#243629]">Password</label>
                    <input
                      type="password"
                      value={codePassword}
                      onChange={(e) => setCodePassword(e.target.value)}
                      placeholder="Enter assigned account password"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#159B42] focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-2xl bg-[#116B32] py-3 text-sm font-bold text-white transition-colors hover:bg-[#159B42] disabled:opacity-50"
                  >
                    {busy ? 'Authenticating...' : 'Authenticate with Account Code'}
                  </button>
                </form>
              )}

              {/* Preserved Google Workspace / Firebase Auth Option */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold text-[#718071]">
                  Or continue with Firebase Google Sign-In (assigns selected role on first access):
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Google Sign-In Role"
                    value={googleRole}
                    onChange={(e) => setGoogleRole(e.target.value as PublicUserRole)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                  >
                    <option value="Worker">Worker</option>
                    <option value="Farmer">Farmer</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Sponsor">Sponsor</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void onGoogleLogin(googleRole)}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-[#243629] hover:bg-[#EAF6EC]"
                  >
                    Sign In with Google as {googleRole}
                  </button>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-[#718071]">
                Need an account? Choose your role:{' '}
                {(['Worker', 'Farmer', 'Supervisor', 'Sponsor'] as PublicUserRole[]).map((r, idx) => (
                  <React.Fragment key={r}>
                    {idx > 0 && ' · '}
                    <button
                      type="button"
                      onClick={() => onGoToRoleRegistration(r)}
                      className="font-bold text-[#159B42] hover:underline"
                    >
                      {r}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleCompleteFirstLoginPasswordChange} className="mt-5 space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <p>
                  First login verified for <strong>{pendingCode}</strong>. Set a personal password
                  before entering your dashboard.
                </p>
              </div>
              {errorMsg && (
                <div role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-900">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold">New Password (min 8 chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#159B42] py-3 text-sm font-bold text-white hover:bg-[#116B32]"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Update Password &amp; Enter Dashboard</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

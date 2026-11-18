import React from 'react';
import { Bell, LayoutDashboard, LogOut, MessageSquare, User } from 'lucide-react';
import type { PublicUserRole, SponsorType } from '../types/farmfund';

export type PrimaryRoleTab = 'Dashboard' | 'Messages' | 'Profile';

interface RoleDashboardShellProps {
  role: PublicUserRole;
  sponsorType?: SponsorType;
  displayName: string;
  activeTab: PrimaryRoleTab;
  onSelectTab: (tab: PrimaryRoleTab) => void;
  unreadCount: number;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const RoleDashboardShell: React.FC<RoleDashboardShellProps> = ({
  role,
  sponsorType,
  displayName,
  activeTab,
  onSelectTab,
  unreadCount,
  onSignOut,
  children,
}) => {
  const roleSubtitle =
    role === 'Sponsor'
      ? sponsorType === 'organisation'
        ? 'Organisation Sponsor'
        : 'Individual Sponsor'
      : role;

  const navItems: { tab: PrimaryRoleTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { tab: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { tab: 'Messages', label: 'Messages', icon: MessageSquare },
    { tab: 'Profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F5F8F3] pb-20 text-[#243629]">
      {/* Strictly 3-Zone Header with ONLY Dashboard, Messages, Profile */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab('Dashboard');
              }}
              className="font-display text-xl font-bold tracking-tight text-[#116B32] whitespace-nowrap"
            >
              FarmFund
            </a>
            <span className="hidden font-mono text-xs font-semibold text-[#718071] sm:inline whitespace-nowrap">
              · {roleSubtitle}
            </span>
          </div>

          <nav
            aria-label={`${role} Primary Navigation`}
            className="hidden items-center gap-6 text-sm font-semibold md:flex"
          >
            {navItems.map(({ tab, label }) => (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                className={`relative py-1 transition-colors duration-200 whitespace-nowrap shrink-0 ${
                  activeTab === tab
                    ? 'font-bold text-[#159B42] underline decoration-2 underline-offset-8'
                    : 'text-[#718071] hover:text-[#243629]'
                }`}
              >
                <span>{label}</span>
                {tab === 'Messages' && unreadCount > 0 && (
                  <span className="ml-1.5 rounded-md bg-[#159B42] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('Messages')}
              aria-label="Notifications and Messages"
              className="relative rounded-xl border border-slate-200 bg-[#F5F8F3] p-2 text-[#243629] transition-colors hover:bg-[#EAF6EC]"
            >
              <Bell className="h-4 w-4 text-[#159B42]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#159B42] px-1 font-mono text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-[#243629] transition-colors duration-200 hover:bg-[#EAF6EC] whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5 text-[#718071]" />
              <span>
                Sign Out (
                {displayName
                  .replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Chief|Alhaji)\s+/i, '')
                  .trim()
                  .split(/\s+/)[0] || displayName.split(' ')[0]}
                )
              </span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Responsive Mobile Bottom Navigation — Strictly Dashboard, Messages, Profile */}
      <nav
        aria-label={`${role} Mobile Navigation`}
        className="fixed right-0 bottom-0 left-0 z-30 border-t border-emerald-900/10 bg-white/95 backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid h-14 max-w-md grid-cols-3 items-center px-2">
          {navItems.map(({ tab, label, icon: Icon }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab)}
              className={`relative flex flex-col items-center justify-center py-1 transition-colors duration-200 ${
                activeTab === tab ? 'text-[#159B42]' : 'text-[#718071]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] font-bold">{label}</span>
              {tab === 'Messages' && unreadCount > 0 && (
                <span className="absolute top-1 right-6 rounded-full bg-[#159B42] px-1 font-mono text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

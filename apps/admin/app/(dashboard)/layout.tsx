'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SidebarNav, type NavItem } from '@pawser/ui';
import { OrgProvider, useOrg } from './context/org-context';

const navItems: NavItem[] = [
  { label: 'Overview', icon: 'dashboard', href: '/' },
  { label: 'Widget Builder', icon: 'widgets', href: '/widget-builder' },
  { label: 'Pet Management', icon: 'pets', href: '/pets' },
  { label: 'Integration', icon: 'link', href: '/integration' },
  { label: 'Billing', icon: 'payments', href: '/billing' },
  { label: 'Settings', icon: 'settings', href: '/settings' },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, orgName, signOut, loading } = useOrg();

  const itemsWithActive = navItems.map((item) => ({
    ...item,
    active: pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)),
  }));

  const bottomItems: NavItem[] = [
    { label: 'Help', icon: 'help', href: 'https://docs.getpawser.io' },
    { label: 'Sign Out', icon: 'logout', href: '#' },
  ];

  const handleNavigate = (href: string) => {
    if (href === '#') {
      signOut();
      return;
    }
    if (href.startsWith('http')) {
      window.open(href, '_blank', 'noopener');
      return;
    }
    router.push(href);
  };

  const currentLabel = itemsWithActive.find((i) => i.active)?.label || 'Dashboard';

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar */}
      <div className="fixed top-0 left-0 h-screen">
        <SidebarNav
          items={itemsWithActive}
          bottomItems={bottomItems}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Main content */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {orgName && (
              <span className="text-xs font-bold text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-full">
                {orgName}
              </span>
            )}
            <span className="text-sm font-bold text-on-surface-variant">{currentLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-surface-container-low animate-pulse" />
            ) : (
              <button
                onClick={signOut}
                title={user?.email ?? 'Sign out'}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-black hover:opacity-80 transition-opacity"
              >
                {userInitial}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-8 max-w-[1440px]">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <DashboardShell>{children}</DashboardShell>
    </OrgProvider>
  );
}

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SidebarNav, type NavItem } from '@pawser/ui';

const navItems: NavItem[] = [
  { label: 'Overview', icon: 'dashboard', href: '/' },
  { label: 'Widget Builder', icon: 'widgets', href: '/widget-builder' },
  { label: 'Pet Management', icon: 'pets', href: '/pets' },
  { label: 'Integration', icon: 'link', href: '/integration' },
  { label: 'Billing', icon: 'payments', href: '/billing' },
  { label: 'Settings', icon: 'settings', href: '/settings' },
];

const bottomItems: NavItem[] = [
  { label: 'Help', icon: 'help', href: '/help' },
  { label: 'Sign Out', icon: 'logout', href: '/logout' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const itemsWithActive = navItems.map((item) => ({
    ...item,
    active: pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)),
  }));

  return (
    <div className="flex h-screen bg-surface">
      <div className="fixed top-0 left-0 h-screen">
        <SidebarNav
          items={itemsWithActive}
          bottomItems={bottomItems}
          onNavigate={(href) => router.push(href)}
        />
      </div>
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-on-surface-variant">
              {itemsWithActive.find((i) => i.active)?.label || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-sm">person</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-8 max-w-[1440px]">{children}</main>
      </div>
    </div>
  );
}


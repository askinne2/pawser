import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-slate-900 text-white p-6">
        <h2 className="text-xl font-bold mb-8">pawser</h2>
        <nav className="flex flex-col gap-1">
          <Link 
            href="/organizations" 
            className="px-4 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Organizations
          </Link>
          <Link 
            href="/users" 
            className="px-4 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Users
          </Link>
          <Link 
            href="/sync" 
            className="px-4 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Sync Management
          </Link>
        </nav>
      </aside>
      <main className="flex-1 bg-slate-50">
        {children}
      </main>
    </div>
  );
}


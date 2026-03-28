import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
            </div>
            <span className="text-xl font-black text-primary">Pawser</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-secondary font-semibold hover:text-primary transition-colors">Log in</Link>
            <Link href="/auth/signup" className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all">
              Get started
            </Link>
          </div>
        </div>
      </nav>
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-extrabold text-on-surface">Plans that grow with you</h1>
            <p className="text-on-surface-variant mt-4 text-lg">Start free. Upgrade when you are ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col">
              <h3 className="text-xl font-bold text-on-surface">Basic</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-on-surface">$0</span>
                <span className="text-on-surface-variant">/month</span>
              </div>
              <p className="text-sm text-on-surface-variant mt-2">Free forever</p>
              <ul className="mt-8 space-y-3 flex-1">
                <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary text-lg">check</span>Up to 50 animals</li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary text-lg">check</span>30-minute sync interval</li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary text-lg">check</span>Basic widget customization</li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary text-lg">check</span>Community support</li>
              </ul>
              <Link href="/auth/signup" className="mt-8 bg-surface-container-lowest text-primary border border-primary/10 px-6 py-3 rounded-xl font-bold hover:bg-surface-container transition-all active:scale-95 text-center">Get Started</Link>
            </div>
            <div className="bg-primary p-8 rounded-xl shadow-[0_20px_40px_rgba(26,27,32,0.04)] flex flex-col relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-primary px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider">Most Popular</span>
              <h3 className="text-xl font-bold text-on-primary">Pro</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-on-primary">$49</span>
                <span className="text-on-primary/70">/month</span>
              </div>
              <p className="text-sm text-on-primary/70 mt-2">For growing shelters</p>
              <ul className="mt-8 space-y-3 flex-1">
                <li className="flex items-center gap-2 text-sm text-on-primary/90"><span className="material-symbols-outlined text-on-primary text-lg">check</span>Unlimited animals</li>
                <li className="flex items-center gap-2 text-sm text-on-primary/90"><span className="material-symbols-outlined text-on-primary text-lg">check</span>5-minute sync interval</li>
                <li className="flex items-center gap-2 text-sm text-on-primary/90"><span className="material-symbols-outlined text-on-primary text-lg">check</span>Full widget customization</li>
                <li className="flex items-center gap-2 text-sm text-on-primary/90"><span className="material-symbols-outlined text-on-primary text-lg">check</span>Priority support</li>
                <li className="flex items-center gap-2 text-sm text-on-primary/90"><span className="material-symbols-outlined text-on-primary text-lg">check</span>Custom domain</li>
              </ul>
              <Link href="/auth/signup?plan=pro" className="mt-8 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-all active:scale-95 text-center">Start Free Trial</Link>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col">
              <h3 className="text-xl font-bold text-on-surface">Enterprise</h3>
              <div className="mt-4"><span className="text-4xl font-black text-on-surface">Custom</span></div>
              <p className="text-sm text-on-surface-variant mt-2">For large organizations</p>
              <ul className="mt-8 space-y-3 flex-1">
                <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary text-lg">check</span>Everything in Pro</li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary text-lg">check</span>2-minute sync interval</li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary text-lg">check</span>Dedicated account manager</li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary text-lg">check</span>SLA guarantee</li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary text-lg">check</span>Custom integrations</li>
              </ul>
              <Link href="/auth/signup?plan=enterprise" className="mt-8 bg-surface-container-lowest text-primary border border-primary/10 px-6 py-3 rounded-xl font-bold hover:bg-surface-container transition-all active:scale-95 text-center">Contact Sales</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

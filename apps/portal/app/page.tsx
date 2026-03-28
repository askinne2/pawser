import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
            </div>
            <span className="text-xl font-black text-primary">Pawser</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-secondary font-semibold hover:text-primary transition-colors">Features</Link>
            <Link href="#pricing" className="text-secondary font-semibold hover:text-primary transition-colors">Pricing</Link>
            <Link href="/auth/login" className="text-secondary font-semibold hover:text-primary transition-colors">Log in</Link>
            <Link href="/auth/signup" className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-6xl font-black text-on-surface leading-tight">
            Find homes for{' '}
            <span className="text-primary italic">every tail.</span>
          </h1>
          <p className="text-xl text-on-surface-variant mt-6 max-w-2xl mx-auto">
            The embeddable adoption widget that syncs with ShelterLuv, matches your brand, and helps every animal find their forever home.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <Link href="/auth/signup" className="bg-primary text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
              Start Free Trial
            </Link>
            <Link href="#features" className="text-primary px-6 py-4 rounded-xl font-bold hover:bg-surface-container-highest transition-all flex items-center gap-2">
              See how it works
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-surface-container-low py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-black text-on-surface-variant/60 uppercase tracking-[0.1em]">Why Pawser</span>
            <h2 className="text-4xl font-bold text-on-surface mt-3">Everything you need to showcase your animals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-2xl">integration_instructions</span>
              </div>
              <h3 className="text-2xl font-black text-on-surface mb-3">Easy Integration</h3>
              <p className="text-on-surface-variant">Embed our adoption widget into any website in seconds. Just paste a script tag and you are live.</p>
            </div>
            {/* Feature 2 */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-2xl">sync</span>
              </div>
              <h3 className="text-2xl font-black text-on-surface mb-3">Automated Sync</h3>
              <p className="text-on-surface-variant">Automatically update listing status across platforms. When an animal is adopted in ShelterLuv, your widget updates in minutes.</p>
            </div>
            {/* Feature 3 */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-2xl">palette</span>
              </div>
              <h3 className="text-2xl font-black text-on-surface mb-3">Customizable Widget</h3>
              <p className="text-on-surface-variant">Tailor every pixel to match your brand identity. Choose colors, layouts, and card styles that feel native to your site.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-black text-on-surface-variant/60 uppercase tracking-[0.1em]">Pricing</span>
            <h2 className="text-4xl font-bold text-on-surface mt-3">Plans that grow with you</h2>
            <p className="text-on-surface-variant mt-3">Start free. Upgrade when you are ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col">
              <h3 className="text-xl font-bold text-on-surface">Basic</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-on-surface">$0</span>
                <span className="text-on-surface-variant">/month</span>
              </div>
              <p className="text-sm text-on-surface-variant mt-2">Free forever</p>
              <ul className="mt-8 space-y-3 flex-1">
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-lg">check</span>
                  Up to 50 animals
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-lg">check</span>
                  30-minute sync interval
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-lg">check</span>
                  Basic widget customization
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-lg">check</span>
                  Community support
                </li>
              </ul>
              <Link href="/auth/signup" className="mt-8 bg-surface-container-lowest text-primary border border-primary/10 px-6 py-3 rounded-xl font-bold hover:bg-surface-container transition-all active:scale-95 text-center">
                Get Started
              </Link>
            </div>
            {/* Pro (highlighted) */}
            <div className="bg-primary p-8 rounded-xl shadow-[0_20px_40px_rgba(26,27,32,0.04)] flex flex-col relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-primary px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider">Most Popular</span>
              <h3 className="text-xl font-bold text-on-primary">Pro</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-on-primary">$49</span>
                <span className="text-on-primary/70">/month</span>
              </div>
              <p className="text-sm text-on-primary/70 mt-2">For growing shelters</p>
              <ul className="mt-8 space-y-3 flex-1">
                <li className="flex items-center gap-2 text-sm text-on-primary/90">
                  <span className="material-symbols-outlined text-on-primary text-lg">check</span>
                  Unlimited animals
                </li>
                <li className="flex items-center gap-2 text-sm text-on-primary/90">
                  <span className="material-symbols-outlined text-on-primary text-lg">check</span>
                  5-minute sync interval
                </li>
                <li className="flex items-center gap-2 text-sm text-on-primary/90">
                  <span className="material-symbols-outlined text-on-primary text-lg">check</span>
                  Full widget customization
                </li>
                <li className="flex items-center gap-2 text-sm text-on-primary/90">
                  <span className="material-symbols-outlined text-on-primary text-lg">check</span>
                  Priority support
                </li>
                <li className="flex items-center gap-2 text-sm text-on-primary/90">
                  <span className="material-symbols-outlined text-on-primary text-lg">check</span>
                  Custom domain
                </li>
              </ul>
              <Link href="/auth/signup?plan=pro" className="mt-8 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-all active:scale-95 text-center">
                Start Free Trial
              </Link>
            </div>
            {/* Enterprise */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col">
              <h3 className="text-xl font-bold text-on-surface">Enterprise</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-on-surface">Custom</span>
              </div>
              <p className="text-sm text-on-surface-variant mt-2">For large organizations</p>
              <ul className="mt-8 space-y-3 flex-1">
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-lg">check</span>
                  Everything in Pro
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-lg">check</span>
                  2-minute sync interval
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-lg">check</span>
                  Dedicated account manager
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-lg">check</span>
                  SLA guarantee
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-lg">check</span>
                  Custom integrations
                </li>
              </ul>
              <Link href="/auth/signup?plan=enterprise" className="mt-8 bg-surface-container-lowest text-primary border border-primary/10 px-6 py-3 rounded-xl font-bold hover:bg-surface-container transition-all active:scale-95 text-center">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-on-primary">Ready to transform your rescue?</h2>
          <p className="text-on-primary/70 mt-4 text-lg">Join 500+ animal welfare organizations already using Pawser to help pets find homes.</p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <Link href="/auth/signup" className="bg-white text-primary px-8 py-4 rounded-xl font-bold hover:bg-white/90 transition-all active:scale-95">
              Start Free Trial
            </Link>
            <Link href="#features" className="text-on-primary/90 px-6 py-4 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2">
              Learn more
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-low py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
              </div>
              <span className="text-lg font-black text-primary">Pawser</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-secondary">
              <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
              <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
              <Link href="/auth/login" className="hover:text-primary transition-colors">Log in</Link>
            </div>
            <p className="text-sm text-on-surface-variant">
              &copy; 2026 Pawser. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

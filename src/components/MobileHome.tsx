import Link from 'next/link';

export default function MobileHome() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground pb-24">
      {/* Header */}
      <header className="px-6 py-10 bg-gradient-to-b from-blue-900/15 to-transparent">
        <h1 className="text-3xl font-bold tracking-tight">Academic OS</h1>
        <p className="text-zinc-400 mt-1">Hello, ready to study?</p>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 px-6 space-y-8">

        {/* Quick Links */}
        <section className="grid grid-cols-2 gap-4">
          <Link href="/sprints" className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800/80 shadow-lg shadow-black/50 hover:border-blue-500/50 transition-all active:scale-95">
            <div className="text-2xl mb-3">📋</div>
            <h3 className="font-semibold text-zinc-100">Sprints</h3>
            <p className="text-xs text-zinc-500 mt-1">Track goals & get phone alerts</p>
          </Link>
          <Link href="/tutor" className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800/80 shadow-lg shadow-black/50 hover:border-purple-500/50 transition-all active:scale-95">
            <div className="text-2xl mb-3">🤖</div>
            <h3 className="font-semibold text-zinc-100">AI Tutor</h3>
            <p className="text-xs text-zinc-500 mt-1">Snap homework for AI help</p>
          </Link>
        </section>

        {/* Android App Download */}
        <section className="bg-zinc-900/60 rounded-2xl p-5 border border-green-800/40">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">🤖 Get the Android App</h3>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            The full Academic OS app: launcher home screen, sprint deadline notifications that work offline, and an AI (Gemma 2) that runs on your phone.
          </p>
          <a
            href="https://github.com/vidhanagrwal92-netizen/shool/releases/latest/download/AcademicOS.apk"
            className="mt-3 block w-full bg-green-600 hover:bg-green-500 text-white text-center font-medium text-sm px-4 py-3 rounded-xl transition-colors"
          >
            ⬇️ Download APK (154 MB)
          </a>
          <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed">
            After downloading, tap the file and allow &quot;install from unknown sources&quot; when Android asks.
          </p>
        </section>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around p-4 pb-8 z-50">
        <Link href="/" className="flex flex-col items-center gap-1.5 text-accent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Home</span>
        </Link>
        <Link href="/tutor" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Tutor</span>
        </Link>
        <Link href="/sprints" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Planner</span>
        </Link>
      </nav>
    </div>
  );
}

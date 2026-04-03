import Link from 'next/link';
import PhoneAlertWidget from '@/components/PhoneAlertWidget';

export default function AppHome() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground pb-24">
      {/* Header */}
      <header className="px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Academic OS</h1>
        <p className="text-zinc-400 mt-1">Hello, ready to study?</p>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 px-6 space-y-8">
        
        {/* Phone Alert Syncer */}
        <PhoneAlertWidget />

        {/* Study Sprints */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-semibold">Study Sprints</h2>
            <Link href="/sprints" className="text-sm text-accent font-medium hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800/80 aspect-square flex flex-col justify-between shadow-lg shadow-black/50">
              <div className="text-zinc-400 text-sm font-medium">Calculus</div>
              <div>
                <div className="text-3xl font-bold text-zinc-100 mb-1">2/3</div>
                <div className="text-xs text-zinc-500 font-medium">Sprints done</div>
              </div>
            </div>
            
            <button className="bg-zinc-900/50 rounded-3xl p-5 border border-zinc-800 border-dashed aspect-square flex flex-col items-center justify-center text-accent/80 hover:bg-zinc-800/50 hover:border-accent/50 transition-colors">
              <span className="text-3xl font-light mb-2">+</span>
              <span className="text-sm font-medium">New Sprint</span>
            </button>
          </div>
        </section>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around p-4 pb-8 z-50">
        <Link href="/" className="flex flex-col items-center gap-1.5 text-accent">
          <div className="w-5 h-5 rounded flex items-center justify-center opacity-80">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Home</span>
        </Link>
        <Link href="/tutor" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
          <div className="w-5 h-5 rounded flex items-center justify-center opacity-80">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Tutor</span>
        </Link>
        <Link href="/sprints" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
          <div className="w-5 h-5 rounded flex items-center justify-center opacity-80">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Planner</span>
        </Link>
      </nav>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function UnifiedSprintsClient({ initialSprints }: { initialSprints: any[] }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Ask for Laptop Notification Permissions
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const safeTargetDate = targetDate ? new Date(targetDate).toISOString() : null;

    const res = await fetch('/api/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, subjectName: subject, targetDate: safeTargetDate })
    });
    
    // If not authenticated for Google Sync, force a login
    if (res.status === 401) {
      signIn('google');
    } else if (res.ok) {
       // Fire a quick Local Laptop Notification to prove we created it!
       if (Notification.permission === "granted") {
           new Notification("Sprint Live!", { body: `Your sprint '${title}' has saved to the database and your phone alarm is officially armed.` });
       }
       window.location.reload();
    }
    setLoading(false);
  };

  const startLaptopTimer = (sprintTitle: string) => {
     if (Notification.permission === "granted") {
        new Notification("Focus Timer Started!", { body: `25 minute deep-work activated for ${sprintTitle}. Close your tabs!` });
        
        // Simulating the Pomodoro finish time
        setTimeout(() => {
           new Notification("Sprint Complete! 🎉", { body: `You finished the 25m focus sprint for ${sprintTitle}. Take a 5 minute break!` });
        }, 25 * 60 * 1000); // 25 Minutes
     } else {
        alert("Please allow laptop notifications in your browser permissions first!");
        Notification.requestPermission();
     }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#09090b] text-zinc-50 pb-24 font-sans">
      <header className="px-6 py-10 bg-gradient-to-b from-blue-900/20 to-transparent">
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Universal Sprints
        </h1>
        <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
           Your Database Pomodoros and Google Calendar Phone alerts are now dynamically fused into one interface!
        </p>
      </header>

      <main className="flex-1 px-6 space-y-8">
        <section>
          <div className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
            <h2 className="text-lg font-semibold mb-4 text-zinc-100 flex items-center justify-between">
              Create Omni-Sprint
              <span className="text-[10px] text-purple-400 border border-purple-500/30 bg-purple-500/10 px-2 py-1 rounded-full uppercase tracking-wider">Syncs Phone + PC</span>
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sprint Goal (e.g. Write essay)" className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              <input required value={targetDate} onChange={(e) => setTargetDate(e.target.value)} type="datetime-local" className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-zinc-300" />
              <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-95">
                {loading ? "Engaging Both Systems..." : "Add to Database & Calendar"}
              </button>
            </form>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4 px-1">Active Sprints</h2>
          {initialSprints.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">No sprints synced yet.</div>
          ) : (
            <div className="space-y-3">
              {initialSprints.map(sprint => (
                <div key={sprint.id} className="group bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors border border-zinc-800/80 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-zinc-200">{sprint.title}</h3>
                    <span className="text-xs text-blue-400 font-medium tracking-wide uppercase px-2 py-0.5 bg-blue-500/10 rounded-full mt-1.5 inline-block">
                      {sprint.subject?.name || "Target"}
                    </span>
                  </div>
                  <button onClick={() => startLaptopTimer(sprint.title)} className="bg-zinc-800 hover:bg-green-600/30 hover:border-green-500 transition-all border border-zinc-700 text-zinc-300 font-medium text-xs px-3 py-2 rounded-xl">
                    Start 25m Timer
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around p-4 pb-8 z-50">
        <Link href="/" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
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
        <Link href="/sprints" className="flex flex-col items-center gap-1.5 text-blue-500 transition-colors">
          <div className="w-5 h-5 rounded flex items-center justify-center opacity-80">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Planner</span>
        </Link>
      </nav>
    </div>
  );
}

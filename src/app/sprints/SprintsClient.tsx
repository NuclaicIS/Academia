'use client';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';

const SPRINT_TYPES = [
  { id: 'class-test', label: 'Class Test', icon: '📝', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'exam', label: 'Exam', icon: '📚', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { id: 'homework', label: 'Homework', icon: '📓', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { id: 'essay', label: 'Essay', icon: '✍️', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'project', label: 'Project', icon: '🛠️', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
] as const;

const REMIND_PRESETS = [
  { label: '15 min before', minutes: 15 },
  { label: '30 min before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '3 hours before', minutes: 180 },
  { label: '1 day before', minutes: 1440 },
];

function typeOf(id: string) {
  return SPRINT_TYPES.find((t) => t.id === id) || SPRINT_TYPES[2];
}

function countdown(deadline: string, now: number): { text: string; urgent: boolean; overdue: boolean } {
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) {
    const ago = -ms;
    const d = Math.floor(ago / 86400000);
    const h = Math.floor((ago % 86400000) / 3600000);
    return { text: d > 0 ? `overdue by ${d}d ${h}h` : `overdue by ${h}h ${Math.floor((ago % 3600000) / 60000)}m`, urgent: true, overdue: true };
  }
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return { text: `in ${d}d ${h}h`, urgent: d < 1, overdue: false };
  if (h > 0) return { text: `in ${h}h ${m}m`, urgent: h < 6, overdue: false };
  return { text: `in ${m}m`, urgent: true, overdue: false };
}

export default function UnifiedSprintsClient() {
  const { data: session, status: authStatus } = useSession();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [sprintType, setSprintType] = useState<string>('homework');
  const [remindChoice, setRemindChoice] = useState<string>('60');
  const [customRemind, setCustomRemind] = useState('');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours'>('hours');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [sprints, setSprints] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [inIframe, setInIframe] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Live countdown tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Detect if we're embedded in the OS desktop window (an iframe). Google
  // sign-in refuses to load inside an iframe, so we pop it out to a real tab.
  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }
  }, []);

  // Register service worker for push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        console.log('Service Worker registered');
      });
    }
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const scheduleNotification = (sprintTitle: string, deadline: string, remindBefore: number) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        title: sprintTitle,
        body: `Deadline for ${sprintTitle}`,
        deadline,
        remindBefore,
      });
    }
  };

  // Fetch sprints and re-arm reminders for upcoming deadlines (service worker
  // timers don't survive restarts, so re-schedule whenever the app opens)
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetch('/api/sprints')
        .then(r => r.json())
        .then(data => {
          const list = data.sprints || [];
          setSprints(list);
          setFetching(false);
          for (const s of list) {
            if (s.deadline && new Date(s.deadline).getTime() > Date.now()) {
              scheduleNotification(s.title, s.deadline, s.remindBefore || 60);
            }
          }
        })
        .catch(() => setFetching(false));
    } else if (authStatus === 'unauthenticated') {
      setFetching(false);
    }
  }, [authStatus]);

  const startSignIn = () => {
    if (inIframe) {
      window.open('/sprints', '_blank', 'noopener');
    } else {
      signIn('google');
    }
  };

  const effectiveRemindMinutes = (): number => {
    if (remindChoice === 'custom') {
      const n = parseFloat(customRemind);
      if (!n || n <= 0) return 60;
      return Math.round(customUnit === 'hours' ? n * 60 : n);
    }
    return parseInt(remindChoice);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    const safeTargetDate = targetDate ? new Date(targetDate).toISOString() : null;
    const remindBefore = effectiveRemindMinutes();

    const res = await fetch('/api/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, subjectName: subject, targetDate: safeTargetDate, type: sprintType, remindBefore })
    });

    if (res.status === 401) {
      setStatusMsg("❌ Please sign in first.");
      setLoading(false);
      startSignIn();
      return;
    } else if (res.ok) {
      if (safeTargetDate) {
        scheduleNotification(title, safeTargetDate, remindBefore);
      }
      if (Notification.permission === "granted") {
        new Notification("Sprint Created!", { body: `"${title}" saved! You'll be reminded ${remindBefore >= 60 ? Math.round(remindBefore / 60 * 10) / 10 + 'h' : remindBefore + 'm'} before the deadline.` });
      }
      setStatusMsg("✅ Sprint saved! Reminder armed.");
      setTitle('');
      setSubject('');
      setTargetDate('');
      const refreshed = await fetch('/api/sprints').then(r => r.json());
      setSprints(refreshed.sprints || []);
    } else {
      const data = await res.json();
      setStatusMsg("❌ " + data.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch('/api/sprints', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      setSprints(prev => prev.filter(s => s.id !== id));
    }
  };

  const startLaptopTimer = (sprintTitle: string) => {
    if (Notification.permission === "granted") {
      new Notification("Focus Timer Started!", { body: `25 minute deep-work activated for "${sprintTitle}". Close your tabs!` });
      setTimeout(() => {
        new Notification("Sprint Complete! 🎉", { body: `You finished the 25m focus sprint for "${sprintTitle}". Take a 5 minute break!` });
      }, 25 * 60 * 1000);
    } else {
      alert("Please allow notifications in your browser first!");
      Notification.requestPermission();
    }
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatRemind = (minutes: number) => {
    if (!minutes) return '1h';
    if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440}d`;
    if (minutes >= 60) return `${Math.round(minutes / 60 * 10) / 10}h`;
    return `${minutes}m`;
  };

  // Sort: overdue & nearest deadlines first, no-deadline last
  const sorted = [...sprints].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#09090b] text-zinc-50 pb-24 font-sans">
      <header className="px-6 py-10 bg-gradient-to-b from-blue-900/20 to-transparent">
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Sprints
        </h1>
        <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
          Plan tests, exams, homework, essays &amp; projects — with reminders on your phone and PC.
        </p>
      </header>

      <main className="flex-1 px-6 space-y-8">
        {/* Auth Status */}
        {authStatus === 'unauthenticated' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-yellow-400 font-medium text-sm">Sign in to start tracking</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {inIframe
                  ? 'Opens in a new tab — come back here after.'
                  : 'Your sprints are private to your account'}
              </p>
            </div>
            <button onClick={startSignIn} className="bg-white text-black font-medium text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition-colors whitespace-nowrap">
              {inIframe ? 'Sign In ↗' : 'Sign In'}
            </button>
          </div>
        )}

        {session && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-green-400 text-xs font-medium">Signed in as {session.user?.email}</p>
          </div>
        )}

        {/* Create Sprint Form */}
        <section>
          <div className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-6 border border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
            <h2 className="text-lg font-semibold mb-4 text-zinc-100">Create Sprint</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Type picker */}
              <div>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">What is it?</label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {SPRINT_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setSprintType(t.id)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all ${
                        sprintType === t.id
                          ? t.color + ' scale-105'
                          : 'border-zinc-800 bg-black/30 text-zinc-500 hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      <span className="text-[9px] font-semibold leading-tight">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${typeOf(sprintType).label} name (e.g. Chapter 5 ${typeOf(sprintType).label.toLowerCase()})`} className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (e.g. Maths)" className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" />

              <div>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Deadline</label>
                <input required value={targetDate} onChange={(e) => setTargetDate(e.target.value)} type="datetime-local" className="w-full mt-2 bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-zinc-300" />
              </div>

              {/* Customizable reminder */}
              <div>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Remind me</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {REMIND_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.minutes}
                      onClick={() => setRemindChoice(String(p.minutes))}
                      className={`text-xs px-3 py-2 rounded-xl border transition-all ${
                        remindChoice === String(p.minutes)
                          ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                          : 'border-zinc-800 bg-black/30 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRemindChoice('custom')}
                    className={`text-xs px-3 py-2 rounded-xl border transition-all ${
                      remindChoice === 'custom'
                        ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                        : 'border-zinc-800 bg-black/30 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    Custom…
                  </button>
                </div>
                {remindChoice === 'custom' && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={customRemind}
                      onChange={(e) => setCustomRemind(e.target.value)}
                      placeholder="e.g. 2"
                      className="flex-1 bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value as 'minutes' | 'hours')}
                      className="bg-black/50 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500"
                    >
                      <option value="minutes">minutes before</option>
                      <option value="hours">hours before</option>
                    </select>
                  </div>
                )}
              </div>

              <button disabled={loading || authStatus !== 'authenticated'} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium px-6 py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-95">
                {loading ? "Saving..." : authStatus !== 'authenticated' ? "Sign in first" : `Add ${typeOf(sprintType).label} Sprint`}
              </button>
            </form>
            {statusMsg && <p className={`text-sm mt-3 font-medium ${statusMsg.includes('❌') ? 'text-red-400' : 'text-green-400'}`}>{statusMsg}</p>}
          </div>
        </section>

        {/* Active Sprints List */}
        <section>
          <h2 className="text-lg font-semibold mb-4 px-1">Your Sprints</h2>
          {fetching ? (
            <div className="text-center py-10 text-zinc-500 text-sm animate-pulse">Loading...</div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
              {authStatus === 'authenticated' ? "No sprints yet. Add one above!" : "Sign in to see your sprints."}
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map(sprint => {
                const t = typeOf(sprint.type);
                const cd = sprint.deadline ? countdown(sprint.deadline, now) : null;
                return (
                  <div key={sprint.id} className={`group bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors border rounded-2xl p-5 ${cd?.overdue ? 'border-red-500/40' : 'border-zinc-800/80'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${t.color}`}>
                            {t.icon} {t.label}
                          </span>
                          <span className="text-xs text-blue-400 font-medium px-2 py-0.5 bg-blue-500/10 rounded-full truncate">
                            {sprint.subject?.name || "—"}
                          </span>
                        </div>
                        <h3 className="font-medium text-zinc-200 mt-2">{sprint.title}</h3>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                          {sprint.deadline && (
                            <>
                              <span className="text-zinc-400">📅 {formatDeadline(sprint.deadline)}</span>
                              <span className={`font-semibold ${cd?.overdue ? 'text-red-400' : cd?.urgent ? 'text-amber-400' : 'text-green-400'}`}>
                                ⏳ {cd?.text}
                              </span>
                              <span className="text-zinc-500">🔔 {formatRemind(sprint.remindBefore)} before</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => startLaptopTimer(sprint.title)} className="bg-zinc-800 hover:bg-green-600/30 hover:border-green-500 transition-all border border-zinc-700 text-zinc-300 font-medium text-xs px-3 py-2 rounded-xl">
                          ⏱ 25m
                        </button>
                        <button onClick={() => handleDelete(sprint.id)} className="bg-zinc-800 hover:bg-red-600/30 hover:border-red-500 transition-all border border-zinc-700 text-red-400 font-medium text-xs px-3 py-2 rounded-xl">
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around p-4 pb-8 z-50">
        <Link href="/" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Home</span>
        </Link>
        <Link href="/tutor" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Tutor</span>
        </Link>
        <Link href="/sprints" className="flex flex-col items-center gap-1.5 text-blue-500 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Planner</span>
        </Link>
      </nav>
    </div>
  );
}

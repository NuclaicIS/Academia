'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Window, { WindowState } from './Window';
import Calculator from './apps/Calculator';
import Browser from './apps/Browser';
import AIChat from './apps/AIChat';
import LoginScreen from './LoginScreen';

interface AppDef {
  id: string;
  title: string;
  icon: string;
  width: number;
  height: number;
  render: () => React.ReactNode;
}

const APPS: AppDef[] = [
  {
    id: 'sprints', title: 'Sprints', icon: '📋', width: 480, height: 640,
    render: () => <iframe src="/sprints" className="w-full h-full" title="Sprints" />,
  },
  {
    id: 'tutor', title: 'AI Tutor', icon: '🎓', width: 520, height: 600,
    render: () => <AIChat mode="tutor" />,
  },
  {
    id: 'vision', title: 'Vision Tutor', icon: '📷', width: 480, height: 680,
    render: () => <iframe src="/tutor" className="w-full h-full" title="Vision Tutor" />,
  },
  {
    id: 'chat', title: 'AI Chat', icon: '✨', width: 520, height: 600,
    render: () => <AIChat mode="chat" />,
  },
  {
    id: 'browser', title: 'Browser', icon: '🌐', width: 900, height: 620,
    render: () => <Browser />,
  },
  {
    id: 'calculator', title: 'Calculator', icon: '🧮', width: 320, height: 460,
    render: () => <Calculator />,
  },
];

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="text-right leading-tight">
      <div className="text-xs font-medium text-zinc-200">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-[10px] text-zinc-500">
        {now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
      </div>
    </div>
  );
}

export default function Desktop() {
  const { data: session, status: authStatus } = useSession();
  const [guest, setGuest] = useState(false);
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [zCounter, setZCounter] = useState(10);
  const [startOpen, setStartOpen] = useState(false);

  const focusedId = windows.reduce<string | null>(
    (top, w) => (!w.minimized && (top === null || w.z > windows.find(x => x.id === top)!.z) ? w.id : top),
    null
  );

  const openApp = useCallback((app: AppDef) => {
    setStartOpen(false);
    setWindows((wins) => {
      const existing = wins.find((w) => w.appId === app.id);
      const nextZ = zCounter + 1;
      setZCounter(nextZ);
      if (existing) {
        return wins.map((w) =>
          w.id === existing.id ? { ...w, minimized: false, z: nextZ } : w
        );
      }
      const offset = (wins.length % 6) * 32;
      return [...wins, {
        id: `${app.id}-${Date.now()}`,
        appId: app.id,
        title: app.title,
        icon: app.icon,
        x: 80 + offset,
        y: 40 + offset,
        width: app.width,
        height: app.height,
        z: nextZ,
        minimized: false,
        maximized: false,
      }];
    });
  }, [zCounter]);

  const update = (id: string, patch: Partial<WindowState>) =>
    setWindows((wins) => wins.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const focus = (id: string) => {
    const nextZ = zCounter + 1;
    setZCounter(nextZ);
    update(id, { z: nextZ, minimized: false });
  };

  const close = (id: string) => setWindows((wins) => wins.filter((w) => w.id !== id));

  // Boot / login gate — sign in at the OS level (top-level, so Google OAuth
  // works) before reaching the desktop. Guests can skip it.
  if (authStatus === 'loading') {
    return (
      <div
        className="h-[100dvh] w-full flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at 30% 20%, #1e2a52 0%, #0b1020 55%, #060810 100%)' }}
      >
        <div className="text-4xl animate-pulse">🎓</div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated' && !guest) {
    return <LoginScreen onContinueAsGuest={() => setGuest(true)} />;
  }

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 30% 20%, #1e2a52 0%, #0b1020 55%, #060810 100%)',
      }}
      onClick={() => setStartOpen(false)}
    >
      {/* Desktop icons */}
      <div className="absolute top-6 left-6 grid grid-flow-col grid-rows-6 gap-3 z-0">
        {APPS.map((app) => (
          <button
            key={app.id}
            onDoubleClick={() => openApp(app)}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-1.5 w-20 p-2 rounded-xl hover:bg-white/10 active:bg-white/15 transition-colors"
            title={`Double-click to open ${app.title}`}
          >
            <span className="text-3xl drop-shadow-lg">{app.icon}</span>
            <span className="text-[11px] text-zinc-200 font-medium drop-shadow">{app.title}</span>
          </button>
        ))}
      </div>

      {/* Windows */}
      {windows.map((win) => {
        const app = APPS.find((a) => a.id === win.appId)!;
        return (
          <Window
            key={win.id}
            win={win}
            focused={focusedId === win.id}
            onFocus={() => focus(win.id)}
            onClose={() => close(win.id)}
            onMinimize={() => update(win.id, { minimized: true })}
            onToggleMaximize={() => update(win.id, { maximized: !win.maximized })}
            onMove={(x, y) => update(win.id, { x, y })}
            onResize={(width, height) => update(win.id, { width, height })}
          >
            {app.render()}
          </Window>
        );
      })}

      {/* Start menu */}
      {startOpen && (
        <div
          className="absolute bottom-[60px] left-2 w-72 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-3 shadow-2xl shadow-black z-[9999]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 pb-2 mb-1 border-b border-zinc-800">
            <div className="text-sm font-semibold text-zinc-100">Academic OS</div>
            <div className="text-[10px] text-zinc-500 truncate">
              {session?.user?.email ? session.user.email : 'Guest · not signed in'}
            </div>
          </div>
          {APPS.map((app) => (
            <button
              key={app.id}
              onClick={() => openApp(app)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800/80 text-left"
            >
              <span className="text-xl">{app.icon}</span>
              <span className="text-sm text-zinc-200">{app.title}</span>
            </button>
          ))}

          <div className="mt-1 pt-2 border-t border-zinc-800">
            {session ? (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-red-600/20 text-left text-red-400"
              >
                <span className="text-xl">⏻</span>
                <span className="text-sm">Log out</span>
              </button>
            ) : (
              <button
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800/80 text-left text-zinc-200"
              >
                <span className="text-xl">🔑</span>
                <span className="text-sm">Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Taskbar */}
      <div className="absolute bottom-0 left-0 right-0 h-[52px] bg-black/70 backdrop-blur-xl border-t border-zinc-800/80 flex items-center px-2 gap-1 z-[9998]">
        <button
          onClick={(e) => { e.stopPropagation(); setStartOpen((s) => !s); }}
          className={`h-10 px-3 rounded-lg flex items-center gap-2 transition-colors ${
            startOpen ? 'bg-zinc-700/80' : 'hover:bg-zinc-800/80'
          }`}
        >
          <span className="text-lg">🎓</span>
          <span className="text-xs font-semibold text-zinc-200 hidden sm:block">Start</span>
        </button>

        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* Running windows */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
          {windows.map((win) => (
            <button
              key={win.id}
              onClick={(e) => {
                e.stopPropagation();
                if (focusedId === win.id && !win.minimized) update(win.id, { minimized: true });
                else focus(win.id);
              }}
              className={`h-10 px-3 rounded-lg flex items-center gap-2 max-w-[160px] border-b-2 transition-colors ${
                focusedId === win.id && !win.minimized
                  ? 'bg-zinc-800/90 border-blue-500'
                  : 'hover:bg-zinc-800/60 border-transparent'
              }`}
            >
              <span>{win.icon}</span>
              <span className="text-xs text-zinc-300 truncate hidden md:block">{win.title}</span>
            </button>
          ))}
        </div>

        <div className="px-3">
          <Clock />
        </div>
      </div>
    </div>
  );
}

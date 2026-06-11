'use client';
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="text-center">
      <div className="text-6xl font-light tracking-tight text-zinc-100">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-sm text-zinc-400 mt-1">
        {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
  );
}

export default function LoginScreen({
  onContinueAsGuest,
  signingIn,
}: {
  onContinueAsGuest: () => void;
  signingIn?: boolean;
}) {
  return (
    <div
      className="h-[100dvh] w-full flex flex-col items-center justify-center gap-10 select-none px-6"
      style={{
        background: 'radial-gradient(ellipse at 30% 20%, #1e2a52 0%, #0b1020 55%, #060810 100%)',
      }}
    >
      <Clock />

      <div className="w-full max-w-sm bg-zinc-950/70 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-black/60 flex flex-col items-center gap-5">
        <div className="text-5xl">🎓</div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100">Academic OS</h1>
          <p className="text-zinc-500 text-sm mt-1">Sign in to sync your sprints &amp; alerts</p>
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 disabled:opacity-60 text-zinc-900 font-medium text-sm px-4 py-3 rounded-xl transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.6 5.6C40.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>

        <button
          onClick={onContinueAsGuest}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Continue without signing in
        </button>
      </div>

      <p className="text-[11px] text-zinc-600 text-center max-w-xs">
        Calculator, Browser and the AI assistant work without an account. Sign in to save your study sprints.
      </p>
    </div>
  );
}

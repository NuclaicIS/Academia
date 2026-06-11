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
}: {
  onContinueAsGuest: () => void;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Could not create account' }));
          setError(data.error);
          setBusy(false);
          return;
        }
      }
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError(mode === 'signup' ? 'Account created but sign-in failed — try again.' : 'Wrong email or password.');
        setBusy(false);
        return;
      }
      // session refreshes automatically; Desktop will switch views
    } catch {
      setError('Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div
      className="h-[100dvh] w-full flex flex-col items-center justify-center gap-8 select-none px-6 overflow-y-auto"
      style={{
        background: 'radial-gradient(ellipse at 30% 20%, #1e2a52 0%, #0b1020 55%, #060810 100%)',
      }}
    >
      <Clock />

      <div className="w-full max-w-sm bg-zinc-950/70 backdrop-blur-xl border border-zinc-800 rounded-3xl p-7 shadow-2xl shadow-black/60 flex flex-col items-center gap-4">
        <div className="text-4xl">🎓</div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100">Academic OS</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {mode === 'signin' ? 'Sign in to sync your sprints & alerts' : 'Create your account'}
          </p>
        </div>

        {/* Email / password */}
        <form onSubmit={submit} className="w-full flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Password (6+ characters)' : 'Password'}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium text-sm px-4 py-3 rounded-xl transition-colors"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {mode === 'signin' ? "New here? Create an account" : 'Already have an account? Sign in'}
        </button>

        <div className="w-full flex items-center gap-3 text-zinc-600 text-[10px]">
          <div className="flex-1 h-px bg-zinc-800" />OR<div className="flex-1 h-px bg-zinc-800" />
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-zinc-900 font-medium text-sm px-4 py-3 rounded-xl transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.6 5.6C40.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          Continue with Google
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

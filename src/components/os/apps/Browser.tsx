'use client';
import { useState } from 'react';

const HOME_URL = 'https://html.duckduckgo.com/html/';

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return HOME_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Looks like a domain → go directly; otherwise search
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(trimmed)) return `https://${trimmed}`;
  return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
}

const proxied = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`;

export default function Browser() {
  const [address, setAddress] = useState('');
  const [url, setUrl] = useState(HOME_URL);
  const [frameKey, setFrameKey] = useState(0);

  const navigate = (target: string) => {
    const next = normalizeUrl(target);
    setUrl(next);
    setAddress(next === HOME_URL ? '' : next);
    setFrameKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <button
          onClick={() => setFrameKey((k) => k + 1)}
          className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 text-sm"
          title="Reload"
        >⟳</button>
        <button
          onClick={() => navigate(HOME_URL)}
          className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 text-sm"
          title="Home"
        >⌂</button>
        <form
          className="flex-1"
          onSubmit={(e) => { e.preventDefault(); navigate(address); }}
        >
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
            placeholder="Search the web or enter address"
            spellCheck={false}
          />
        </form>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 text-sm flex items-center justify-center"
          title="Open in full browser"
        >↗</a>
      </div>

      {/* Page (fetched through the built-in proxy so sites can't block embedding) */}
      <iframe
        key={frameKey}
        src={proxied(url)}
        className="flex-1 w-full bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="Browser"
      />
      <div className="px-3 py-1 text-[10px] text-zinc-600 bg-zinc-900 border-t border-zinc-800 shrink-0">
        Lightweight browsing mode — heavy sites and logins work best via ↗ in your full browser.
      </div>
    </div>
  );
}

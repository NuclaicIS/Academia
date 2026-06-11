'use client';
import { useState } from 'react';

// Bing works through the proxy from any IP (incl. Vercel datacenters);
// DuckDuckGo/Google block datacenter IPs with 403, so we use Bing for search.
const SEARCH_URL = (q: string) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`;

const QUICK_LINKS = [
  { label: 'Wikipedia', url: 'https://en.wikipedia.org', icon: '📚' },
  { label: 'Bing', url: 'https://www.bing.com', icon: '🔎' },
  { label: 'Khan Academy', url: 'https://www.khanacademy.org', icon: '🎓' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com', icon: '🗞️' },
];

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Looks like a domain → go directly; otherwise treat as a search query
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(trimmed)) return `https://${trimmed}`;
  return SEARCH_URL(trimmed);
}

const proxied = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`;

export default function Browser() {
  const [address, setAddress] = useState('');
  const [url, setUrl] = useState<string | null>(null); // null = local start page
  const [frameKey, setFrameKey] = useState(0);

  const navigate = (target: string) => {
    const next = normalizeUrl(target);
    if (!next) return;
    setUrl(next);
    setAddress(next);
    setFrameKey((k) => k + 1);
  };

  const goHome = () => {
    setUrl(null);
    setAddress('');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <button
          onClick={() => url && setFrameKey((k) => k + 1)}
          className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 text-sm disabled:opacity-30"
          disabled={!url}
          title="Reload"
        >⟳</button>
        <button
          onClick={goHome}
          className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 text-sm"
          title="Start page"
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
            placeholder="Search the web or enter an address"
            spellCheck={false}
          />
        </form>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 text-sm flex items-center justify-center"
            title="Open in full browser"
          >↗</a>
        )}
      </div>

      {/* Page or local start page */}
      {url ? (
        <iframe
          key={frameKey}
          src={proxied(url)}
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Browser"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-zinc-950 to-zinc-900 px-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🌐</div>
            <h2 className="text-xl font-semibold text-zinc-200">Academic OS Browser</h2>
          </div>
          <form
            className="w-full max-w-md"
            onSubmit={(e) => { e.preventDefault(); navigate(address); }}
          >
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-full px-5 py-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 shadow-lg"
              placeholder="Search the web or enter an address"
              spellCheck={false}
            />
          </form>
          <div className="flex flex-wrap justify-center gap-3 max-w-md">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.url}
                onClick={() => navigate(link.url)}
                className="flex flex-col items-center gap-1.5 w-20 p-3 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="text-[11px] text-zinc-300">{link.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {url && (
        <div className="px-3 py-1 text-[10px] text-zinc-600 bg-zinc-900 border-t border-zinc-800 shrink-0">
          Lightweight browsing mode — for logins and heavy sites use ↗ to open in your full browser.
        </div>
      )}
    </div>
  );
}

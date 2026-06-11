'use client';
import { useState, useEffect, useCallback } from 'react';

// Wikipedia-first browser — built for learning. Search goes to Wikipedia,
// articles can be saved to your account and read later (cached on this
// computer too, so saved articles open even without internet).

const WIKI_SEARCH = (q: string) =>
  `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`;

const QUICK_LINKS = [
  { label: 'Mathematics', url: 'https://en.wikipedia.org/wiki/Portal:Mathematics', icon: '➗' },
  { label: 'Science', url: 'https://en.wikipedia.org/wiki/Portal:Science', icon: '🔬' },
  { label: 'History', url: 'https://en.wikipedia.org/wiki/Portal:History', icon: '🏛️' },
  { label: 'Geography', url: 'https://en.wikipedia.org/wiki/Portal:Geography', icon: '🌍' },
  { label: 'Literature', url: 'https://en.wikipedia.org/wiki/Portal:Literature', icon: '📖' },
  { label: 'Technology', url: 'https://en.wikipedia.org/wiki/Portal:Technology', icon: '💻' },
];

interface SavedArticle {
  id: string;
  title: string;
  url: string;
}

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(trimmed)) return `https://${trimmed}`;
  return WIKI_SEARCH(trimmed);
}

const proxied = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`;
const isWikiArticle = (url: string) => /^https?:\/\/[a-z-]+\.(?:m\.)?wikipedia\.org\/wiki\/[^:]+$/i.test(url);

const CACHE_KEY = 'saved-articles-cache';

export default function Browser() {
  const [address, setAddress] = useState('');
  const [url, setUrl] = useState<string | null>(null); // null = start page
  const [reader, setReader] = useState<{ title: string; content: string } | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [saved, setSaved] = useState<SavedArticle[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSaved = useCallback(async () => {
    // Cached list first (works offline), then refresh from the account
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setSaved(JSON.parse(cached).list || []);
    } catch {}
    try {
      const res = await fetch('/api/articles');
      const { articles } = await res.json();
      if (articles) {
        setSaved(articles);
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, list: articles }));
      }
    } catch {}
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const navigate = (target: string) => {
    const next = normalizeUrl(target);
    if (!next) return;
    setReader(null);
    setUrl(next);
    setAddress(next);
    setFrameKey((k) => k + 1);
  };

  const goHome = () => {
    setUrl(null);
    setReader(null);
    setAddress('');
    loadSaved();
  };

  const saveArticle = async () => {
    if (!url || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(`✓ Saved "${data.title}" to your account`);
        loadSaved();
      } else {
        setNotice(`⚠️ ${data.error}`);
      }
    } catch {
      setNotice('⚠️ Could not save — check your internet.');
    } finally {
      setSaving(false);
    }
  };

  const openSaved = async (a: SavedArticle) => {
    setUrl(null);
    setAddress(a.url);
    // Local cache first → instant + offline
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      if (cache[a.id]) {
        setReader({ title: a.title, content: cache[a.id] });
        return;
      }
    } catch {}
    setReader({ title: a.title, content: 'Loading…' });
    try {
      const res = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id }),
      });
      const { article } = await res.json();
      if (article) {
        setReader({ title: article.title, content: article.content });
        try {
          const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
          cache[a.id] = article.content;
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch {} // localStorage full — reading still works
      } else {
        setReader({ title: a.title, content: 'Could not load this article.' });
      }
    } catch {
      setReader({ title: a.title, content: 'Offline — this article was not cached on this computer yet.' });
    }
  };

  const deleteSaved = async (a: SavedArticle, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch('/api/articles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id }),
    }).catch(() => {});
    setSaved((prev) => prev.filter((x) => x.id !== a.id));
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
        <button onClick={goHome} className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 text-sm" title="Start page">⌂</button>
        <form className="flex-1" onSubmit={(e) => { e.preventDefault(); navigate(address); }}>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
            placeholder="Search Wikipedia or enter an address"
            spellCheck={false}
          />
        </form>
        {url && isWikiArticle(url) && (
          <button
            onClick={saveArticle}
            disabled={saving}
            className="h-7 px-3 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium"
            title="Save to your account for offline reading"
          >{saving ? 'Saving…' : '💾 Save'}</button>
        )}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 text-sm flex items-center justify-center"
            title="Open in full browser">↗</a>
        )}
      </div>

      {notice && (
        <div className="px-3 py-1.5 text-[11px] bg-zinc-900 text-zinc-300 border-b border-zinc-800 shrink-0">{notice}</div>
      )}

      {/* Content: live page / saved-article reader / start page */}
      {url ? (
        <iframe
          key={frameKey}
          src={proxied(url)}
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Browser"
        />
      ) : reader ? (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h1 className="text-xl font-bold text-zinc-100 mb-4">📖 {reader.title}</h1>
          <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap max-w-3xl">{reader.content}</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center gap-6 px-6 py-10">
            <div className="text-center">
              <div className="text-4xl mb-2">📚</div>
              <h2 className="text-xl font-semibold text-zinc-200">Learn something</h2>
              <p className="text-xs text-zinc-500 mt-1">Powered by Wikipedia</p>
            </div>
            <form className="w-full max-w-md" onSubmit={(e) => { e.preventDefault(); navigate(address); }}>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 rounded-full px-5 py-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 shadow-lg"
                placeholder="Search Wikipedia…"
                spellCheck={false}
              />
            </form>
            <div className="flex flex-wrap justify-center gap-3 max-w-md">
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.url}
                  onClick={() => navigate(link.url)}
                  className="flex flex-col items-center gap-1.5 w-24 p-3 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <span className="text-[11px] text-zinc-300">{link.label}</span>
                </button>
              ))}
            </div>

            {saved.length > 0 && (
              <div className="w-full max-w-md">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">💾 Saved articles (work offline)</h3>
                <div className="space-y-2">
                  {saved.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => openSaved(a)}
                      className="w-full flex items-center justify-between gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-4 py-3 text-left transition-colors"
                    >
                      <span className="text-sm text-zinc-200 truncate">📄 {a.title}</span>
                      <span
                        onClick={(e) => deleteSaved(a, e)}
                        className="text-zinc-600 hover:text-red-400 text-xs px-1"
                        title="Remove"
                      >✕</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {url && (
        <div className="px-3 py-1 text-[10px] text-zinc-600 bg-zinc-900 border-t border-zinc-800 shrink-0">
          {isWikiArticle(url) ? 'Tip: 💾 Save stores this article to your account for offline reading.' : 'Lightweight browsing mode — use ↗ for logins and heavy sites.'}
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// Document Keeper — upload and store study materials on your account.
// Supported: png, jpeg, pdf, txt, pptx, xlsx, docx. Images / PDFs / text can be
// previewed inline; Office files can be downloaded to open.

interface DocMeta {
  id: string;
  name: string;
  ext: string;
  mime: string;
  size: number;
  createdAt: string;
}

const ACCEPT = '.png,.jpg,.jpeg,.pdf,.txt,.pptx,.xlsx,.docx';
const MAX_BYTES = 3 * 1024 * 1024;

const ICONS: Record<string, string> = {
  png: '🖼️', jpeg: '🖼️', jpg: '🖼️',
  pdf: '📕', txt: '📝', pptx: '📊', xlsx: '📈', docx: '📘',
};

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

export default function Documents() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; mime: string; ext: string; dataUrl: string; text?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      const { documents } = await res.json();
      setDocs(documents || []);
    } catch {
      setNotice('⚠️ Could not load your documents — check your internet.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setNotice(`⚠️ "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max upload is 3 MB.`);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const base64 = dataUrl.split(',').pop() || '';
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, data: base64 }),
      });
      const result = await res.json();
      if (res.ok) {
        setNotice(`✓ Saved "${file.name}"`);
        load();
      } else {
        setNotice(`⚠️ ${result.error}`);
      }
    } catch {
      setNotice('⚠️ Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const fetchData = async (id: string): Promise<{ name: string; mime: string; data: string } | null> => {
    try {
      const res = await fetch('/api/documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const { document } = await res.json();
      return document || null;
    } catch {
      return null;
    }
  };

  const openPreview = async (d: DocMeta) => {
    setNotice(null);
    setPreview({ name: d.name, mime: d.mime, ext: d.ext, dataUrl: '' }); // loading placeholder
    const full = await fetchData(d.id);
    if (!full) { setNotice('⚠️ Could not open this file.'); setPreview(null); return; }
    const dataUrl = `data:${full.mime};base64,${full.data}`;
    if (d.ext === 'txt') {
      let text = '';
      try { text = atob(full.data); } catch { text = '(could not decode text)'; }
      setPreview({ name: d.name, mime: d.mime, ext: d.ext, dataUrl, text });
    } else {
      setPreview({ name: d.name, mime: d.mime, ext: d.ext, dataUrl });
    }
  };

  const download = async (d: DocMeta) => {
    const full = await fetchData(d.id);
    if (!full) { setNotice('⚠️ Could not download this file.'); return; }
    const a = document.createElement('a');
    a.href = `data:${full.mime};base64,${full.data}`;
    a.download = full.name;
    a.click();
  };

  const remove = async (d: DocMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocs((prev) => prev.filter((x) => x.id !== d.id));
    await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id }),
    }).catch(() => {});
  };

  // ---- Preview view ----
  if (preview) {
    const isImg = ['png', 'jpeg', 'jpg'].includes(preview.ext);
    const isPdf = preview.ext === 'pdf';
    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <button onClick={() => setPreview(null)} className="h-7 px-3 rounded-md hover:bg-zinc-800 text-zinc-300 text-xs">← Back</button>
          <span className="text-xs text-zinc-200 truncate flex-1">{ICONS[preview.ext] || '📄'} {preview.name}</span>
          <a href={preview.dataUrl} download={preview.name} className="h-7 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center">⬇ Download</a>
        </div>
        <div className="flex-1 overflow-auto">
          {!preview.dataUrl ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Loading…</div>
          ) : isImg ? (
            <div className="h-full flex items-center justify-center p-4 bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.dataUrl} alt={preview.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : isPdf ? (
            <iframe src={preview.dataUrl} className="w-full h-full bg-white" title={preview.name} />
          ) : preview.ext === 'txt' ? (
            <pre className="p-5 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">{preview.text}</pre>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="text-5xl">{ICONS[preview.ext] || '📄'}</div>
              <p className="text-sm text-zinc-300">No inline preview for .{preview.ext} files.</p>
              <a href={preview.dataUrl} download={preview.name} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">⬇ Download to open</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- List view ----
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-zinc-100">📂 Documents</h2>
          <p className="text-[11px] text-zinc-500">Your study materials, saved to your account.</p>
        </div>
        <input ref={fileRef} type="file" accept={ACCEPT} onChange={onPick} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium"
        >{busy ? 'Uploading…' : '⬆ Upload'}</button>
      </div>

      {notice && (
        <div className="px-4 py-2 text-[11px] bg-zinc-900 text-zinc-300 border-b border-zinc-800 shrink-0">{notice}</div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {docs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-5xl opacity-70">📂</div>
            <p className="text-sm text-zinc-400">No documents yet.</p>
            <p className="text-[11px] text-zinc-600">Upload PNG, JPEG, PDF, TXT, PPTX, XLSX or DOCX — up to 3 MB each.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => openPreview(d)}
                className="w-full flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-3 py-2.5 text-left transition-colors"
              >
                <span className="text-2xl shrink-0">{ICONS[d.ext] || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-200 truncate">{d.name}</div>
                  <div className="text-[10px] text-zinc-500">
                    {d.ext.toUpperCase()} · {fmtSize(d.size)} · {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span
                  onClick={(e) => { e.stopPropagation(); download(d); }}
                  className="text-zinc-500 hover:text-blue-400 text-sm px-1.5"
                  title="Download"
                >⬇</span>
                <span
                  onClick={(e) => remove(d, e)}
                  className="text-zinc-600 hover:text-red-400 text-sm px-1.5"
                  title="Delete"
                >✕</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

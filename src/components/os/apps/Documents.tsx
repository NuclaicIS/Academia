'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Grid, xlsxToGrids, gridsToXlsx, renderDocx, textToDocx,
  textToBase64, base64ToText,
} from '@/lib/office';

// Document Keeper — store, view, edit and create study materials, all in the
// browser (no server, no LibreOffice). Supported: png, jpeg, pdf, txt, pptx,
// xlsx, docx.
//   view : png/jpeg (image), pdf (embedded), docx (rendered), pptx (download)
//   edit : txt (text editor), xlsx (spreadsheet grid)
//   make : new txt / xlsx / docx from scratch

interface DocMeta {
  id: string;
  name: string;
  ext: string;
  mime: string;
  size: number;
  createdAt: string;
}

// Editing an existing doc (id set) or making a new one (id undefined).
interface Editing {
  id?: string;
  name: string;
  ext: 'txt' | 'xlsx' | 'docx';
  text?: string;       // txt + new docx
  grids?: Grid[];      // xlsx
  active?: number;     // active sheet index
}

interface Viewing {
  id: string;
  name: string;
  ext: string;
  mime: string;
  base64: string;
}

const ACCEPT = '.png,.jpg,.jpeg,.pdf,.txt,.pptx,.xlsx,.docx';
const MAX_BYTES = 3 * 1024 * 1024;

const ICONS: Record<string, string> = {
  png: '🖼️', jpeg: '🖼️', jpg: '🖼️',
  pdf: '📕', txt: '📝', pptx: '📊', xlsx: '📈', docx: '📘',
};

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

const blankGrid = (): Grid => ({
  name: 'Sheet1',
  rows: Array.from({ length: 12 }, () => Array.from({ length: 6 }, () => '')),
});

export default function Documents() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const docxBox = useRef<HTMLDivElement>(null);

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

  // Render a .docx into the viewer box whenever we open one
  useEffect(() => {
    if (viewing?.ext === 'docx' && docxBox.current) {
      renderDocx(viewing.base64, docxBox.current).catch(() => {
        if (docxBox.current) docxBox.current.innerHTML =
          '<p style="color:#a1a1aa;padding:1rem">Could not render this document. Try downloading it.</p>';
      });
    }
  }, [viewing]);

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

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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
      if (res.ok) { setNotice(`✓ Saved "${file.name}"`); load(); }
      else setNotice(`⚠️ ${result.error}`);
    } catch {
      setNotice('⚠️ Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  // ---- open an existing doc → editor (txt/xlsx) or viewer (others) ----
  const openDoc = async (d: DocMeta) => {
    setNotice(null);
    setBusy(true);
    const full = await fetchData(d.id);
    setBusy(false);
    if (!full) { setNotice('⚠️ Could not open this file.'); return; }

    if (d.ext === 'txt') {
      setEditing({ id: d.id, name: d.name, ext: 'txt', text: safeText(full.data) });
    } else if (d.ext === 'xlsx') {
      try {
        const grids = await xlsxToGrids(full.data);
        setEditing({ id: d.id, name: d.name, ext: 'xlsx', grids: grids.length ? grids : [blankGrid()], active: 0 });
      } catch {
        setNotice('⚠️ Could not read that spreadsheet.');
      }
    } else {
      setViewing({ id: d.id, name: d.name, ext: d.ext, mime: d.mime, base64: full.data });
    }
  };

  // ---- maker: brand-new document ----
  const makeNew = (ext: 'txt' | 'xlsx' | 'docx') => {
    setShowNew(false);
    setNotice(null);
    if (ext === 'txt') setEditing({ name: 'Untitled.txt', ext: 'txt', text: '' });
    else if (ext === 'docx') setEditing({ name: 'Untitled.docx', ext: 'docx', text: '' });
    else setEditing({ name: 'Untitled.xlsx', ext: 'xlsx', grids: [blankGrid()], active: 0 });
  };

  // ---- save the editor (create if new, update if existing) ----
  const saveEditing = async () => {
    if (!editing) return;
    setSaving(true);
    setNotice(null);
    try {
      let base64: string;
      if (editing.ext === 'txt') base64 = textToBase64(editing.text || '');
      else if (editing.ext === 'docx') base64 = await textToDocx(editing.text || '');
      else base64 = await gridsToXlsx(editing.grids || [blankGrid()]);

      const res = editing.id
        ? await fetch('/api/documents', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editing.id, data: base64 }),
          })
        : await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: ensureExt(editing.name, editing.ext), data: base64 }),
          });
      const result = await res.json();
      if (res.ok) {
        setNotice(`✓ Saved "${ensureExt(editing.name, editing.ext)}"`);
        setEditing(null);
        load();
      } else {
        setNotice(`⚠️ ${result.error}`);
      }
    } catch {
      setNotice('⚠️ Could not save. The file may be too large (max 3 MB).');
    } finally {
      setSaving(false);
    }
  };

  const download = async (d: DocMeta, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // ===================== EDITOR =====================
  if (editing) {
    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <button onClick={() => setEditing(null)} className="h-7 px-3 rounded-md hover:bg-zinc-800 text-zinc-300 text-xs">← Back</button>
          <span className="text-base">{ICONS[editing.ext]}</span>
          <input
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            className="flex-1 bg-zinc-800/60 rounded-md px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
          />
          <button
            onClick={saveEditing}
            disabled={saving}
            className="h-7 px-3 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium"
          >{saving ? 'Saving…' : '💾 Save'}</button>
        </div>

        {editing.ext === 'txt' || editing.ext === 'docx' ? (
          <>
            {editing.ext === 'docx' && (
              <div className="px-4 py-1.5 text-[11px] bg-zinc-900/60 text-zinc-500 border-b border-zinc-800">
                Type your document — it’s saved as a real .docx (each line is a paragraph).
              </div>
            )}
            <textarea
              value={editing.text || ''}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              placeholder="Start typing…"
              className="flex-1 w-full bg-zinc-950 text-zinc-100 text-sm leading-relaxed p-5 resize-none focus:outline-none font-mono"
              spellCheck
            />
          </>
        ) : (
          <SheetEditor editing={editing} setEditing={setEditing} />
        )}
      </div>
    );
  }

  // ===================== VIEWER =====================
  if (viewing) {
    const isImg = ['png', 'jpeg', 'jpg'].includes(viewing.ext);
    const isPdf = viewing.ext === 'pdf';
    const isDocx = viewing.ext === 'docx';
    const dataUrl = `data:${viewing.mime};base64,${viewing.base64}`;
    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <button onClick={() => setViewing(null)} className="h-7 px-3 rounded-md hover:bg-zinc-800 text-zinc-300 text-xs">← Back</button>
          <span className="text-xs text-zinc-200 truncate flex-1">{ICONS[viewing.ext] || '📄'} {viewing.name}</span>
          <a href={dataUrl} download={viewing.name} className="h-7 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center">⬇ Download</a>
        </div>
        <div className="flex-1 overflow-auto">
          {isImg ? (
            <div className="h-full flex items-center justify-center p-4 bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt={viewing.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : isPdf ? (
            <iframe src={dataUrl} className="w-full h-full bg-white" title={viewing.name} />
          ) : isDocx ? (
            <div className="bg-white min-h-full p-6 text-black"><div ref={docxBox} /></div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="text-5xl">{ICONS[viewing.ext] || '📄'}</div>
              <p className="text-sm text-zinc-300">
                {viewing.ext === 'pptx'
                  ? 'PowerPoint files open best in their own app.'
                  : `No inline preview for .${viewing.ext} files.`}
              </p>
              <a href={dataUrl} download={viewing.name} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">⬇ Download to open</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===================== LIST =====================
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-zinc-100">📂 Documents</h2>
          <p className="text-[11px] text-zinc-500">View, edit and create — saved to your account.</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNew((s) => !s)}
            className="h-9 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium"
          >＋ New ▾</button>
          {showNew && (
            <div className="absolute right-0 mt-1 w-44 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
              <button onClick={() => makeNew('txt')} className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">📝 Text file</button>
              <button onClick={() => makeNew('xlsx')} className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">📈 Spreadsheet</button>
              <button onClick={() => makeNew('docx')} className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800">📘 Document</button>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept={ACCEPT} onChange={onPick} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium"
        >{busy ? 'Working…' : '⬆ Upload'}</button>
      </div>

      {notice && (
        <div className="px-4 py-2 text-[11px] bg-zinc-900 text-zinc-300 border-b border-zinc-800 shrink-0">{notice}</div>
      )}

      <div className="flex-1 overflow-y-auto p-3" onClick={() => showNew && setShowNew(false)}>
        {docs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-5xl opacity-70">📂</div>
            <p className="text-sm text-zinc-400">No documents yet.</p>
            <p className="text-[11px] text-zinc-600">Upload PNG, JPEG, PDF, TXT, PPTX, XLSX or DOCX — or hit ＋ New to create one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => openDoc(d)}
                className="w-full flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-3 py-2.5 text-left transition-colors"
              >
                <span className="text-2xl shrink-0">{ICONS[d.ext] || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-200 truncate">{d.name}</div>
                  <div className="text-[10px] text-zinc-500">
                    {d.ext.toUpperCase()} · {fmtSize(d.size)} · {new Date(d.createdAt).toLocaleDateString()}
                    {(d.ext === 'txt' || d.ext === 'xlsx') && <span className="text-green-500/70"> · editable</span>}
                  </div>
                </div>
                <span onClick={(e) => download(d, e)} className="text-zinc-500 hover:text-blue-400 text-sm px-1.5" title="Download">⬇</span>
                <span onClick={(e) => remove(d, e)} className="text-zinc-600 hover:text-red-400 text-sm px-1.5" title="Delete">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Editable spreadsheet grid (one worksheet at a time).
function SheetEditor({ editing, setEditing }: { editing: Editing; setEditing: (e: Editing) => void }) {
  const grids = editing.grids || [];
  const active = editing.active || 0;
  const grid = grids[active];
  if (!grid) return null;

  const setCell = (r: number, c: number, val: string) => {
    const rows = grid.rows.map((row) => [...row]);
    rows[r][c] = val;
    const next = grids.map((g, i) => (i === active ? { ...g, rows } : g));
    setEditing({ ...editing, grids: next });
  };

  const addRow = () => {
    const cols = grid.rows[0]?.length || 6;
    const rows = [...grid.rows.map((r) => [...r]), Array.from({ length: cols }, () => '')];
    setEditing({ ...editing, grids: grids.map((g, i) => (i === active ? { ...g, rows } : g)) });
  };

  const addCol = () => {
    const rows = grid.rows.map((r) => [...r, '']);
    setEditing({ ...editing, grids: grids.map((g, i) => (i === active ? { ...g, rows } : g)) });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {grids.length > 1 && (
        <div className="flex gap-1 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 overflow-x-auto shrink-0">
          {grids.map((g, i) => (
            <button
              key={i}
              onClick={() => setEditing({ ...editing, active: i })}
              className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap ${i === active ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            >{g.name}</button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto p-2">
        <table className="border-collapse">
          <tbody>
            {grid.rows.map((row, r) => (
              <tr key={r}>
                <td className="bg-zinc-900 text-zinc-600 text-[10px] text-center px-1 select-none sticky left-0">{r + 1}</td>
                {row.map((cell, c) => (
                  <td key={c} className="border border-zinc-800 p-0">
                    <input
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      className="w-28 bg-transparent text-zinc-100 text-xs px-2 py-1 focus:outline-none focus:bg-zinc-800"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 px-3 py-2 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <button onClick={addRow} className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs">＋ Row</button>
        <button onClick={addCol} className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs">＋ Column</button>
      </div>
    </div>
  );
}

// Decode stored base64 text safely (handles Unicode).
function safeText(base64: string): string {
  try { return base64ToText(base64); } catch { return ''; }
}

// Make sure a maker filename keeps the right extension.
function ensureExt(name: string, ext: string): string {
  const trimmed = name.trim() || 'Untitled';
  return trimmed.toLowerCase().endsWith(`.${ext}`) ? trimmed : `${trimmed}.${ext}`;
}

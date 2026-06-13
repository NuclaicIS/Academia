'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ocrImage, tutorOnText } from '@/lib/localTutor';

export default function TutorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setFeedback(null);

    try {
      // Step 1: read the homework off the image — runs in the browser, no key.
      setStatus('Reading your homework… 0%');
      const text = await ocrImage(file, (pct) => setStatus(`Reading your homework… ${pct}%`));

      if (!text) {
        setStatus(null);
        setFeedback("I couldn't read any text from that image. Try a clearer, brighter photo with the writing facing straight on.");
        return;
      }

      // Step 2: let the local AI tutor work on the transcribed text — no key.
      setStatus('Thinking…');
      await tutorOnText(
        text,
        (full) => { setFeedback(full); setStatus(null); },
        (s) => setStatus(s),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setFeedback('⚠️ ' + msg);
    } finally {
      setStatus(null);
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setFeedback(null);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#09090b] text-zinc-50 pb-24 font-sans">
      <header className="px-6 py-10 bg-gradient-to-b from-purple-900/20 to-transparent">
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          Vision Tutor
        </h1>
        <p className="text-zinc-400 mt-2 text-sm">Upload your homework for instant step-by-step verification.</p>
      </header>

      <main className="flex-1 px-6 space-y-8 flex flex-col items-center">
        <form onSubmit={handleUpload} className="w-full max-w-sm flex flex-col items-center gap-6">
          <label 
            htmlFor="homework-upload"
            className="w-full aspect-square border-2 border-dashed border-purple-500/50 hover:border-purple-400 bg-purple-500/5 rounded-3xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all shadow-[0_0_30px_rgba(168,85,247,0.15)] relative overflow-hidden group"
          >
            {previewUrl ? (
               <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
            ) : null}
            <div className="z-10 bg-black/40 backdrop-blur-md p-4 rounded-full mb-3 text-purple-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </div>
            <span className="z-10 font-medium text-zinc-300 shadow-black text-center">
              {file ? 'Tap to change image' : 'Tap to snap or upload'}
            </span>
            <input 
              id="homework-upload" 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              onChange={handleFileChange}
            />
          </label>

          <button 
            type="submit" 
            disabled={!file || loading}
            className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all ${
              file && !loading 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_20px_rgba(219,39,119,0.5)] hover:scale-[1.02]' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {loading ? 'Analyzing...' : 'Check My Work'}
          </button>
        </form>

        {/* Live status while OCR / the local model works */}
        {status && (
          <div className="w-full max-w-sm rounded-2xl px-4 py-3 text-xs bg-zinc-900/70 border border-zinc-800 text-zinc-400 animate-pulse">
            ⏳ {status}
          </div>
        )}

        {/* Feedback Display */}
        {feedback && (
          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <h3 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
              Feedback
            </h3>
            <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
              {feedback}
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around p-4 pb-8 z-50">
        <Link href="/" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
          <div className="w-5 h-5 rounded flex items-center justify-center opacity-80">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Home</span>
        </Link>
        <Link href="/tutor" className="flex flex-col items-center gap-1.5 text-purple-400 transition-colors">
          <div className="w-5 h-5 rounded flex items-center justify-center opacity-80">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Tutor</span>
        </Link>
        <Link href="/sprints" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
          <div className="w-5 h-5 rounded flex items-center justify-center opacity-80">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase">Planner</span>
        </Link>
      </nav>
    </div>
  );
}

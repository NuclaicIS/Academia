'use client';
import { useState, useRef, useEffect } from 'react';
import { getEngine, webGPUAvailable, isModelCached } from '@/lib/webllm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPTS = {
  chat: 'You are the built-in AI assistant of Academic OS, a student\'s personal operating system. Be friendly, concise and helpful.',
  tutor: 'You are an expert, patient tutor inside Academic OS. Explain concepts step by step, check the student\'s reasoning, and ask guiding questions instead of just giving answers when appropriate.',
};

export default function AIChat({ mode = 'chat' }: { mode?: 'chat' | 'tutor' }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  // 'server' = Ollama on this computer; 'browser' = WebLLM in the visitor's browser
  const backendRef = useRef<'server' | 'browser' | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // Check if the model is already saved on this computer (so it won't re-download)
  useEffect(() => {
    if (webGPUAvailable()) {
      isModelCached().then(setCached);
    }
  }, []);

  const streamFromServer = async (history: Message[]): Promise<boolean> => {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, mode }),
    });
    if (!res.ok || !res.body) return false;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let answer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      answer += decoder.decode(value, { stream: true });
      setMessages([...history, { role: 'assistant', content: answer }]);
    }
    return true;
  };

  const streamFromBrowser = async (history: Message[]) => {
    if (!webGPUAvailable()) {
      setMessages([...history, {
        role: 'assistant',
        content: '⚠️ The AI needs either Ollama running on this computer, or a browser with WebGPU (Chrome or Edge) to run the model locally in your browser.',
      }]);
      return;
    }
    const alreadySaved = await isModelCached();
    setStatus(alreadySaved
      ? 'Loading the AI model from your saved copy on this computer…'
      : 'Setting up the AI — downloading qwen2.5-1.5b (~1 GB, one time only; it saves on this computer so it never downloads again)…');
    const engine = await getEngine((text) => setStatus(text));
    setStatus(null);
    setCached(true);

    const chunks = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[mode] },
        ...history,
      ],
      stream: true,
    });
    let answer = '';
    for await (const chunk of chunks) {
      answer += chunk.choices[0]?.delta?.content || '';
      setMessages([...history, { role: 'assistant', content: answer }]);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history = [...messages, { role: 'user' as const, content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    try {
      if (backendRef.current !== 'browser') {
        try {
          const ok = await streamFromServer(history);
          if (ok) {
            backendRef.current = 'server';
            return;
          }
        } catch {
          // server unreachable — fall through to browser model
        }
        backendRef.current = 'browser';
      }
      await streamFromBrowser(history);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages([...history, { role: 'assistant', content: `⚠️ ${msg}` }]);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const accent = mode === 'tutor' ? 'purple' : 'blue';

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-zinc-600 px-6">
            <div className="text-3xl">{mode === 'tutor' ? '🎓' : '✨'}</div>
            <p className="text-sm">
              {mode === 'tutor'
                ? 'Ask me anything about your schoolwork — I explain step by step.'
                : 'Chat with the built-in AI (qwen2.5-1.5b). It runs on this computer — no cloud needed.'}
            </p>
            {cached && (
              <p className="text-[11px] text-green-500/80 flex items-center gap-1">
                ✓ AI model saved on this computer — loads instantly
              </p>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? accent === 'purple'
                    ? 'bg-purple-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
              }`}
            >
              {m.content || (loading && i === messages.length - 1 && !status ? '…' : '')}
            </div>
          </div>
        ))}
        {status && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-xs bg-zinc-900/70 border border-zinc-800 text-zinc-400 animate-pulse">
              ⏬ {status}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="p-3 border-t border-zinc-800 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'tutor' ? 'Ask your tutor…' : 'Message the AI…'}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={`px-4 rounded-xl text-sm font-medium text-white disabled:opacity-40 ${
            accent === 'purple' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          Send
        </button>
      </form>
    </div>
  );
}

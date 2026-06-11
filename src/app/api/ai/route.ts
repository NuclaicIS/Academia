import { NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';

const SYSTEM_PROMPTS: Record<string, string> = {
  chat: 'You are the built-in AI assistant of Academic OS, a student\'s personal operating system. Be friendly, concise and helpful.',
  tutor: 'You are an expert, patient tutor inside Academic OS. Explain concepts step by step, check the student\'s reasoning, and ask guiding questions instead of just giving answers when appropriate.',
};

export async function POST(req: Request) {
  try {
    const { messages, mode } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat },
          ...messages,
        ],
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Local model error (${res.status}): ${detail}` },
        { status: 502 }
      );
    }

    // Ollama streams NDJSON; forward just the text tokens as a plain stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.message?.content) {
              controller.enqueue(encoder.encode(chunk.message.content));
            }
          } catch {
            // ignore partial/malformed lines
          }
        }
      },
      cancel() {
        reader.cancel();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'The local AI model is offline. Make sure Ollama is running on this computer (it starts automatically after install), then try again.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

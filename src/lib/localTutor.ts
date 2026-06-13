// Fully keyless Vision Tutor — no API keys, no rate limits.
//
// Step 1: OCR the homework image right in the browser with Tesseract.js.
// Step 2: Feed the transcribed text to the local AI (Ollama on this computer,
//         or the in-browser WebLLM model as a fallback) for step-by-step help.
//
// Nothing here touches Gemini or any paid/keyed cloud API.

import { getEngine, webGPUAvailable } from './webllm';

// ---- Step 1: read text from the image, entirely client-side ----
export async function ocrImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const Tesseract = (await import('tesseract.js')).default;
  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return (data.text || '').trim();
}

const TUTOR_SYSTEM =
  'You are an expert, patient tutor. Explain concepts step by step, check the ' +
  "student's reasoning, point out mistakes clearly, and show how to solve each " +
  'problem correctly.';

function buildPrompt(homework: string): string {
  return (
    'Here is my homework, transcribed from a photo by OCR (it may contain small ' +
    'recognition mistakes, so use your judgement):\n\n"""\n' +
    homework +
    '\n"""\n\nVerify the answers, point out any errors clearly, and give a ' +
    'step-by-step explanation of how to solve each problem correctly.'
  );
}

// ---- Step 2: stream a tutor response from the local model ----
// Tries the keyless Ollama server first; if it's unreachable (e.g. on the
// deployed site) it runs the model in the browser via WebLLM.
export async function tutorOnText(
  homework: string,
  onToken: (full: string) => void,
  onStatus?: (s: string | null) => void,
): Promise<void> {
  const userMsg = buildPrompt(homework);

  // 1) Local Ollama server (fast when running on this computer)
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userMsg }],
        mode: 'tutor',
      }),
    });
    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        onToken(answer);
      }
      return;
    }
  } catch {
    // server not reachable — fall through to the in-browser model
  }

  // 2) In-browser WebLLM (keyless, works anywhere with WebGPU)
  if (!webGPUAvailable()) {
    throw new Error(
      'The AI needs either Ollama running on this computer, or a browser with ' +
        'WebGPU (Chrome or Edge) to run the model locally.',
    );
  }
  onStatus?.('Loading the local AI model (one-time ~1 GB download, then it stays saved)…');
  const engine = await getEngine((t) => onStatus?.(t));
  onStatus?.(null);

  const chunks = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: TUTOR_SYSTEM },
      { role: 'user', content: userMsg },
    ],
    stream: true,
  });
  let answer = '';
  for await (const chunk of chunks) {
    answer += chunk.choices[0]?.delta?.content || '';
    onToken(answer);
  }
}

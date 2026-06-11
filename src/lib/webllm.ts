// Runs qwen2.5-1.5b directly in the visitor's browser via WebLLM (WebGPU).
// The model (~950 MB) is downloaded once and cached by the browser, so the
// AI works on any computer — including the Vercel deployment — with no server.

import type { MLCEngine } from '@mlc-ai/web-llm';

export const WEBLLM_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

let enginePromise: Promise<MLCEngine> | null = null;

export function webGPUAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

// True once the model weights have been downloaded and saved in the browser's
// Cache storage — they persist across reloads, so it never re-downloads.
export async function isModelCached(): Promise<boolean> {
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm');
    return await hasModelInCache(WEBLLM_MODEL);
  } catch {
    return false;
  }
}

export function getEngine(onProgress: (text: string) => void): Promise<MLCEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      try {
        return await CreateMLCEngine(WEBLLM_MODEL, {
          initProgressCallback: (p) => onProgress(p.text),
        });
      } catch (err) {
        enginePromise = null; // allow retry
        throw err;
      }
    })();
  }
  return enginePromise;
}

// Runs qwen2.5-1.5b directly in the visitor's browser via WebLLM (WebGPU).
// The model (~950 MB) is downloaded once and cached by the browser, so the
// AI works on any computer — including the Vercel deployment — with no server.

import type { MLCEngine } from '@mlc-ai/web-llm';

export const WEBLLM_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

let enginePromise: Promise<MLCEngine> | null = null;

export function webGPUAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
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

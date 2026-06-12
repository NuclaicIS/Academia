'use client';

// OS look-and-feel settings, persisted in localStorage so each computer
// keeps its own customization (rice it like Arch).

export type OSTheme = 'default' | 'tahoe';

export interface OSSettings {
  wallpaper: string;
  accent: string;
  iconSize: 'small' | 'medium' | 'large';
  taskbarPosition: 'bottom' | 'top';
  theme: OSTheme;
  clock24h: boolean;
}

export const WALLPAPERS: { id: string; name: string; css: string }[] = [
  { id: 'midnight', name: 'Midnight (default)', css: 'radial-gradient(ellipse at 30% 20%, #1e2a52 0%, #0b1020 55%, #060810 100%)' },
  { id: 'arch', name: 'Arch Dark', css: 'linear-gradient(135deg, #0f1419 0%, #1a1b26 50%, #16161e 100%)' },
  { id: 'nord', name: 'Nord', css: 'linear-gradient(135deg, #2e3440 0%, #3b4252 60%, #434c5e 100%)' },
  { id: 'sunset', name: 'Sunset', css: 'linear-gradient(135deg, #1a0533 0%, #4a1942 50%, #93326e 100%)' },
  { id: 'forest', name: 'Forest', css: 'radial-gradient(ellipse at 70% 30%, #14352a 0%, #0a1f14 60%, #050d08 100%)' },
  { id: 'ocean', name: 'Ocean', css: 'linear-gradient(180deg, #002133 0%, #003a52 60%, #001821 100%)' },
  { id: 'dracula', name: 'Dracula', css: 'linear-gradient(135deg, #282a36 0%, #1e1f29 70%, #15151c 100%)' },
  { id: 'matrix', name: 'Terminal Green', css: 'radial-gradient(ellipse at 50% 0%, #032b03 0%, #021202 60%, #000500 100%)' },
  // Bright, vivid gradients — these shine with the macOS Tahoe glass theme
  { id: 'tahoe', name: 'Tahoe', css: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 35%, #06b6d4 70%, #22d3ee 100%)' },
  { id: 'sequoia', name: 'Sequoia', css: 'linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f97316 100%)' },
  { id: 'aurora', name: 'Aurora', css: 'linear-gradient(135deg, #0f766e 0%, #2563eb 45%, #7c3aed 100%)' },
  { id: 'sky', name: 'Sky', css: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #1e40af 100%)' },
  { id: 'peach', name: 'Peach', css: 'linear-gradient(135deg, #fb7185 0%, #f59e0b 50%, #fbbf24 100%)' },
  { id: 'graphite', name: 'Graphite', css: 'linear-gradient(135deg, #3f3f46 0%, #27272a 55%, #18181b 100%)' },
];

export const ACCENTS: { id: string; name: string; hex: string }[] = [
  { id: 'blue', name: 'Blue', hex: '#3b82f6' },
  { id: 'purple', name: 'Purple', hex: '#a855f7' },
  { id: 'green', name: 'Green', hex: '#22c55e' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
  { id: 'pink', name: 'Pink', hex: '#ec4899' },
  { id: 'orange', name: 'Orange', hex: '#f97316' },
  { id: 'red', name: 'Red', hex: '#ef4444' },
  { id: 'teal', name: 'Teal', hex: '#14b8a6' },
  { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b' },
  { id: 'lime', name: 'Lime', hex: '#84cc16' },
  { id: 'sky', name: 'Sky', hex: '#0ea5e9' },
  { id: 'violet', name: 'Violet', hex: '#8b5cf6' },
];

export const THEMES: { id: OSTheme; name: string; desc: string }[] = [
  { id: 'default', name: 'Classic', desc: 'Solid dark windows — fast and focused.' },
  { id: 'tahoe', name: 'macOS Tahoe', desc: 'Liquid Glass — translucent, blurred, floating dock.' },
];

export const DEFAULT_SETTINGS: OSSettings = {
  wallpaper: 'midnight',
  accent: '#3b82f6',
  iconSize: 'medium',
  taskbarPosition: 'bottom',
  theme: 'default',
  clock24h: false,
};

const KEY = 'academic-os-settings';
const EVENT = 'os-settings-changed';

export function loadSettings(): OSSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(patch: Partial<OSSettings>) {
  const next = { ...loadSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  // Also sync to the signed-in account so customization follows the email
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => {}); // guests / offline: local save is enough
}

// Pull account settings (if signed in) and apply them locally
export async function loadAccountSettings(): Promise<OSSettings | null> {
  try {
    const res = await fetch('/api/settings');
    const { settings } = await res.json();
    if (settings) {
      const merged = { ...DEFAULT_SETTINGS, ...settings };
      localStorage.setItem(KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent(EVENT, { detail: merged }));
      return merged;
    }
  } catch {}
  return null;
}

export function onSettingsChange(cb: (s: OSSettings) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent).detail as OSSettings);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function wallpaperCss(id: string): string {
  return (WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0]).css;
}

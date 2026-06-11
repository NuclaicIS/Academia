'use client';

// OS look-and-feel settings, persisted in localStorage so each computer
// keeps its own customization (rice it like Arch).

export interface OSSettings {
  wallpaper: string;
  accent: string;
  iconSize: 'small' | 'medium' | 'large';
  taskbarPosition: 'bottom' | 'top';
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
];

export const DEFAULT_SETTINGS: OSSettings = {
  wallpaper: 'midnight',
  accent: '#3b82f6',
  iconSize: 'medium',
  taskbarPosition: 'bottom',
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
}

export function onSettingsChange(cb: (s: OSSettings) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent).detail as OSSettings);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function wallpaperCss(id: string): string {
  return (WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0]).css;
}

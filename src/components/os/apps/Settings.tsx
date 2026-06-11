'use client';
import { useState } from 'react';
import {
  loadSettings, saveSettings, WALLPAPERS, ACCENTS, OSSettings,
} from '@/lib/osSettings';

export default function Settings() {
  const [settings, setSettings] = useState<OSSettings>(loadSettings);

  const apply = (patch: Partial<OSSettings>) => {
    saveSettings(patch);
    setSettings((s) => ({ ...s, ...patch }));
  };

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 p-5 space-y-7">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">🎨 Appearance</h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">Make it yours — saved on this computer.</p>
      </div>

      {/* Wallpaper */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Wallpaper</h3>
        <div className="grid grid-cols-4 gap-2">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              onClick={() => apply({ wallpaper: w.id })}
              className={`aspect-video rounded-lg border-2 transition-all overflow-hidden ${
                settings.wallpaper === w.id ? 'scale-105' : 'border-zinc-800 hover:border-zinc-600'
              }`}
              style={{
                background: w.css,
                borderColor: settings.wallpaper === w.id ? settings.accent : undefined,
              }}
              title={w.name}
            />
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">
          {WALLPAPERS.find((w) => w.id === settings.wallpaper)?.name}
        </p>
      </section>

      {/* Accent color */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Accent color</h3>
        <div className="flex flex-wrap gap-2.5">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => apply({ accent: a.hex })}
              className={`w-9 h-9 rounded-full transition-transform ${
                settings.accent === a.hex ? 'scale-110 ring-2 ring-white/70 ring-offset-2 ring-offset-zinc-950' : 'hover:scale-105'
              }`}
              style={{ background: a.hex }}
              title={a.name}
            />
          ))}
        </div>
      </section>

      {/* Icon size */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Desktop icon size</h3>
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => apply({ iconSize: size })}
              className={`text-xs px-4 py-2 rounded-xl border capitalize transition-all ${
                settings.iconSize === size
                  ? 'text-white'
                  : 'border-zinc-800 bg-black/30 text-zinc-400 hover:border-zinc-600'
              }`}
              style={settings.iconSize === size ? { borderColor: settings.accent, background: settings.accent + '26' } : undefined}
            >
              {size}
            </button>
          ))}
        </div>
      </section>

      {/* Taskbar position */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Taskbar position</h3>
        <div className="flex gap-2">
          {(['bottom', 'top'] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => apply({ taskbarPosition: pos })}
              className={`text-xs px-4 py-2 rounded-xl border capitalize transition-all ${
                settings.taskbarPosition === pos
                  ? 'text-white'
                  : 'border-zinc-800 bg-black/30 text-zinc-400 hover:border-zinc-600'
              }`}
              style={settings.taskbarPosition === pos ? { borderColor: settings.accent, background: settings.accent + '26' } : undefined}
            >
              {pos}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={() => {
          apply({ wallpaper: 'midnight', accent: '#3b82f6', iconSize: 'medium', taskbarPosition: 'bottom' });
        }}
        className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
      >
        Reset to defaults
      </button>
    </div>
  );
}

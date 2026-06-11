'use client';
import { useState } from 'react';

const BUTTONS = [
  ['C', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['±', '0', '.', '='],
];

function evaluate(expr: string): string {
  const sanitized = expr.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');
  if (!/^[\d+\-*/.%() ]+$/.test(sanitized)) return 'Error';
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${sanitized})`)();
    if (typeof result !== 'number' || !isFinite(result)) return 'Error';
    return String(Math.round(result * 1e10) / 1e10);
  } catch {
    return 'Error';
  }
}

export default function Calculator() {
  const [display, setDisplay] = useState('0');

  const press = (key: string) => {
    setDisplay((prev) => {
      if (key === 'C') return '0';
      if (key === '⌫') return prev.length > 1 ? prev.slice(0, -1) : '0';
      if (key === '=') return evaluate(prev);
      if (key === '±') return prev.startsWith('-') ? prev.slice(1) : '-' + prev;
      if (prev === '0' && /[\d]/.test(key)) return key;
      if (prev === 'Error') return /[\d]/.test(key) ? key : '0';
      return prev + key;
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-3 gap-3">
      <div className="bg-zinc-900 rounded-xl px-4 py-5 text-right border border-zinc-800">
        <div className="text-3xl font-mono text-zinc-100 truncate">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-2 flex-1">
        {BUTTONS.flat().map((key) => (
          <button
            key={key}
            onClick={() => press(key)}
            className={`rounded-xl text-lg font-medium transition-all active:scale-95 ${
              key === '='
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : /[÷×−+%]/.test(key)
                ? 'bg-zinc-800 hover:bg-zinc-700 text-blue-400'
                : key === 'C' || key === '⌫'
                ? 'bg-zinc-800 hover:bg-zinc-700 text-red-400'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}

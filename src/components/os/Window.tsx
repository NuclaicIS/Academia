'use client';
import { useRef, useCallback } from 'react';

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

interface WindowProps {
  win: WindowState;
  focused: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  children: React.ReactNode;
  glass?: boolean;
}

export default function Window({
  win, focused, onFocus, onClose, onMinimize, onToggleMaximize, onMove, onResize, children, glass = false,
}: WindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const onTitlePointerDown = useCallback((e: React.PointerEvent) => {
    if (win.maximized) return;
    onFocus();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: win.x, origY: win.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [win.maximized, win.x, win.y, onFocus]);

  const onTitlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    onMove(
      Math.max(-win.width + 80, d.origX + e.clientX - d.startX),
      Math.max(0, d.origY + e.clientY - d.startY)
    );
  }, [onMove, win.width]);

  const onTitlePointerUp = useCallback(() => { dragRef.current = null; }, []);

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    onFocus();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: win.width, origH: win.height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [win.width, win.height, onFocus]);

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const r = resizeRef.current;
    onResize(
      Math.max(320, r.origW + e.clientX - r.startX),
      Math.max(220, r.origH + e.clientY - r.startY)
    );
  }, [onResize]);

  const onResizePointerUp = useCallback(() => { resizeRef.current = null; }, []);

  if (win.minimized) return null;

  const style: React.CSSProperties = win.maximized
    ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 52px)', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z };

  return (
    <div
      className={`absolute flex flex-col overflow-hidden border shadow-2xl shadow-black/60 transition-shadow ${
        glass
          ? `rounded-2xl backdrop-blur-2xl bg-zinc-900/55 ${focused ? 'border-white/25' : 'border-white/10'}`
          : `rounded-xl bg-zinc-950 ${focused ? 'border-zinc-600' : 'border-zinc-800'}`
      }`}
      style={style}
      onPointerDown={onFocus}
    >
      {/* Title bar */}
      <div
        className={`flex items-center gap-2 px-3 h-9 select-none cursor-grab active:cursor-grabbing shrink-0 ${
          glass
            ? (focused ? 'bg-white/10' : 'bg-white/5')
            : (focused ? 'bg-zinc-800' : 'bg-zinc-900')
        }`}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onDoubleClick={onToggleMaximize}
      >
        <span className="text-sm">{win.icon}</span>
        <span className="text-xs font-medium text-zinc-300 truncate flex-1">{win.title}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onMinimize}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-md hover:bg-zinc-700 text-zinc-400 text-sm leading-none"
            title="Minimize"
          >–</button>
          <button
            onClick={onToggleMaximize}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-md hover:bg-zinc-700 text-zinc-400 text-xs leading-none"
            title="Maximize"
          >▢</button>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-md hover:bg-red-600 text-zinc-400 hover:text-white text-sm leading-none"
            title="Close"
          >✕</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        {children}
        {/* Block iframe from eating pointer events while dragging/resizing an unfocused window */}
        {!focused && <div className="absolute inset-0" />}
      </div>

      {/* Resize handle */}
      {!win.maximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
        >
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-zinc-600" />
        </div>
      )}
    </div>
  );
}

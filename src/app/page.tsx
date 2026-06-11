'use client';
import { useState, useEffect } from 'react';
import Desktop from '@/components/os/Desktop';
import MobileHome from '@/components/MobileHome';

export default function AppHome() {
  // Desktop OS shell on large screens with a mouse; mobile dashboard otherwise
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (pointer: fine)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isDesktop === null) {
    return <div className="h-[100dvh] bg-background" />;
  }

  return isDesktop ? <Desktop /> : <MobileHome />;
}

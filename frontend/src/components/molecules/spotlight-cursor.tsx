'use client';

import { useEffect, useRef, useState } from 'react';

type SpotlightCursorProps = {
  children: React.ReactNode;
  className?: string;
};

export default function SpotlightCursor({ children, className = '' }: SpotlightCursorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    const spotlight = spotlightRef.current;
    if (!container || !spotlight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spotlight.style.left = `${x}px`;
      spotlight.style.top = `${y}px`;
    };

    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {children}

      <div
        ref={spotlightRef}
        className={`pointer-events-none spotlight-cursor-color absolute z-10 h-100 w-100 -translate-x-1/2 -translate-y-1/2 rounded-full  blur-2xl transition-opacity duration-300 ${
          visible ? 'opacity-50' : 'opacity-0'
        }`}
      />
    </div>
  );
}

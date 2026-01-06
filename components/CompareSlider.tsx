
import React, { useState, useRef, useEffect } from 'react';

interface CompareSliderProps {
  beforeUrl: string;
  afterUrl: string;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({ beforeUrl, afterUrl }) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percentage);
  };

  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#121212] rounded-[2.5rem] overflow-hidden cursor-ew-resize select-none border border-gray-200 dark:border-white/5 shadow-2xl"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* Before Image (Bottom) */}
      <img 
        src={beforeUrl} 
        alt="Before" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none p-4"
      />
      
      {/* After Image (Top, Clipped) */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <img 
          src={afterUrl} 
          alt="After" 
          className="w-full h-full object-contain pointer-events-none p-4"
        />
      </div>

      {/* Slider Line */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white/30 backdrop-blur-md shadow-2xl z-20 pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl border border-gray-100 group transition-transform">
          <svg className="w-6 h-6 text-indigo-600 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3m0 0l3 3m-3-3h18M16 15l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-8 left-8 z-30 pointer-events-none">
        <span className="bg-white/90 backdrop-blur-md text-[#222222] text-[11px] font-black uppercase px-4 py-2 rounded-xl tracking-[0.15em] border border-gray-200 shadow-xl">Before</span>
      </div>
      <div className="absolute top-8 right-8 z-30 pointer-events-none">
        <span className="bg-indigo-600/90 backdrop-blur-md text-white text-[11px] font-black uppercase px-4 py-2 rounded-xl tracking-[0.15em] shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5)]">After</span>
      </div>
    </div>
  );
};

import React, { useState } from 'react';

interface TPLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  useImageOnly?: boolean;
}

export const TPLogo: React.FC<TPLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  useImageOnly = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Image / Vector Monogram Container */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        {!imgError ? (
          <img
            src="/logo.png"
            alt="Travel Point Logo"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain drop-shadow-xs"
          />
        ) : (
          /* Fallback SVG Monogram TP with Yellow Arrow Swoosh */
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Yellow Swoosh Arrow */}
            <path
              d="M 22,50 C 22,25 45,12 70,18 C 82,21 90,32 88,48 C 86,64 74,80 50,82 C 38,83 26,76 20,65"
              stroke="#FACC15"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            {/* Arrow Head */}
            <path
              d="M 64,12 L 75,17 L 68,26"
              fill="#FACC15"
              stroke="#FACC15"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            
            {/* Monogram T in Dark Charcoal */}
            <path
              d="M 28 30 H 62 V 38 H 48 V 72 H 38 V 38 H 28 Z"
              fill="#0F172A"
            />
            
            {/* Monogram P in Dark Charcoal */}
            <path
              d="M 45 30 H 72 C 80 30 84 35 84 43 C 84 51 80 56 72 56 H 55 V 72 H 45 Z M 55 38 V 48 H 70 C 74 48 76 46 76 43 C 76 40 74 38 70 38 Z"
              fill="#0F172A"
            />
          </svg>
        )}
      </div>

      {/* Brand Text */}
      {!useImageOnly && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-slate-900 ${titleSizes[size]}`}>
              TP
            </span>
            <span className={`font-black tracking-tight text-[#00b4a2] ${titleSizes[size]}`}>
              PAGOS
            </span>
            <span className="bg-yellow-400 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-2xs">
              PRO
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
              Travel Point • Logic & Services
            </span>
          )}
        </div>
      )}
    </div>
  );
};

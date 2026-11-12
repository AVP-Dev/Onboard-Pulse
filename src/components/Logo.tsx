import React from 'react';

interface LogoProps {
  variant?: 'full' | 'compact' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ variant = 'full', size = 'md', className = '' }: LogoProps) {
  const iconSizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  const Mark = (
    <div
      className={`relative rounded-lg bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-primary-foreground shadow-xs shrink-0 overflow-hidden ${iconSizeClasses} ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        className="w-full h-full p-1"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M 5 16.5 L 9 16.5 L 12 11.5 L 15.5 21.5 L 19 8 L 22.5 18 L 25 16.5 L 27 16.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="8" r="1.8" fill="#5EEAD4" />
      </svg>
    </div>
  );

  if (variant === 'mark') {
    return Mark;
  }

  return (
    <div className="flex items-center gap-2.5">
      {Mark}
      <div className="leading-tight">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-foreground text-sm">
          <span>Onboard Pulse</span>
          <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
            HR
          </span>
        </div>
        {variant === 'full' && (
          <div className="text-[11px] text-muted-foreground font-medium">
            Адаптация 90 дней
          </div>
        )}
      </div>
    </div>
  );
}

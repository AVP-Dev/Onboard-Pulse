'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface LiveClockProps {
  className?: string;
  showIcon?: boolean;
}

export function LiveClock({ className = '', showIcon = true }: LiveClockProps) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDateStr(
        now.toLocaleDateString('ru-RU', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeStr) {
    return (
      <div className={`text-xs text-muted-foreground flex items-center gap-1.5 ${className}`}>
        <span className="capitalize">Onboard Pulse</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      {showIcon && <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />}
      <span className="capitalize font-medium text-foreground">{dateStr}</span>
      <span className="text-muted-foreground/60">•</span>
      <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
        <Clock className="w-3 h-3 shrink-0" />
        <span>{timeStr}</span>
      </div>
    </div>
  );
}

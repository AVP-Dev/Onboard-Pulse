import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, LayoutDashboard, ListFilter } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-3.5 rounded-full bg-status-warning/10 text-status-warning mb-4">
        <AlertCircle className="w-10 h-10" />
      </div>

      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        Ошибка 404
      </span>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Страница или проблема не найдена
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        Запрошенный ресурс, анкета или карточка проблемы отсутствует в базе данных. Если вы перешли по ссылке из старой сессии, воспользуйтесь реестром проблем или вернитесь на дашборд.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/issues"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
        >
          <ListFilter className="w-4 h-4" />
          <span>Перейти в очередь проблем</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card text-foreground text-xs font-medium hover:bg-surface-secondary transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Главный дашборд</span>
        </Link>
      </div>
    </div>
  );
}

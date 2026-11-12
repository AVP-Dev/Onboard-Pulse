'use client';

import React, { useState } from 'react';
import { UserPlus, RefreshCw } from 'lucide-react';
import { NewEmployeeModal } from './NewEmployeeModal';
import { useRouter } from 'next/navigation';

export function DashboardHeaderActions() {
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();

  const handleResetDemoData = async () => {
    if (!confirm('Сбросить демо-данные к исходному состоянию?')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Ошибка при сбросе данных');
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка соединения');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Reset Demo button for live presentations */}
        <button
          type="button"
          onClick={handleResetDemoData}
          disabled={isResetting}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
          title="Сбросить демо-базу и восстановить демонстрационные данные"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Сбросить данные демо</span>
        </button>

        {/* Register Newcomer */}
        <button
          type="button"
          onClick={() => setIsEmployeeModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Зарегистрировать новичка</span>
        </button>
      </div>

      <NewEmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onCreated={() => router.refresh()}
      />
    </>
  );
}

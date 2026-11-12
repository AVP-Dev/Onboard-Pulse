'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  UserPlus,
  Smartphone,
  AlertCircle,
  Clock,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface DemoScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewEmployee?: () => void;
  onOpenNewSurvey?: () => void;
}

export function DemoScenariosModal({
  isOpen,
  onClose,
  onOpenNewEmployee,
  onOpenNewSurvey,
}: DemoScenariosModalProps) {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const handleResetData = async () => {
    if (!confirm('Сбросить демо-данные к исходному состоянию (базовые тикеты и сотрудники)?')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Ошибка сброса данных');
        return;
      }
      router.refresh();
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка соединения');
    } finally {
      setIsResetting(false);
    }
  };

  const scenarios = [
    {
      num: 1,
      title: 'Регистрация новичка и выдача анкеты',
      role: 'HR-Специалист',
      icon: UserPlus,
      color: 'text-primary bg-primary/10 border-primary/20',
      description:
        'HR регистрирует сотрудника в системе (Склад, Розничные магазины, Отдел продаж или Офис). Система автоматически генерирует персональную одноразовую ссылку на первый пульс-опрос.',
      action: {
        label: 'Запустить: Зарегистрировать новичка',
        onClick: () => {
          onClose();
          if (onOpenNewEmployee) {
            onOpenNewEmployee();
          } else {
            router.push('/employees');
          }
        },
      },
    },
    {
      num: 2,
      title: 'Заполнение анкеты новичком со смартфона',
      role: 'Новый сотрудник',
      icon: Smartphone,
      color: 'text-status-info bg-status-info/10 border-status-info/20',
      description:
        'Сотрудник открывает ссылку на мобильном (390px, без HR-навигации), оценивает 5 факторов (1–5) крупными тач-кнопками. При оценке ≤ 3 открывается поле уточнения проблемы.',
      action: {
        label: 'Открыть тестовую анкету (Владислав Павлов)',
        href: '/survey/tok_demo_active_vladislav',
        external: true,
      },
    },
    {
      num: 3,
      title: 'Автоматическая детекция и регистрация сигнала',
      role: 'Rule Engine',
      icon: AlertCircle,
      color: 'text-destructive bg-destructive/10 border-destructive/20',
      description:
        'Прозрачный Rule Engine: оценки 1–2 формируют критический сигнал (CRITICAL), оценка 3 — сигнал внимания (ATTENTION). Инвариант: повторные сигналы дополняют существующий тикет без дубликатов.',
      action: {
        label: 'Перейти в Очередь проблем (/issues)',
        href: '/issues',
      },
    },
    {
      num: 4,
      title: 'Назначение наставника и плана действий в 1 клик',
      role: 'HR / Наставник',
      icon: Clock,
      color: 'text-status-warning bg-status-warning/10 border-status-warning/20',
      description:
        'В карточке проблемы HR нажимает «Назначить наставника в 1 клик». Подтягивается наставник смены, указывается план и дедлайн. Статус меняется: NEW → IN_PROGRESS.',
      action: {
        label: 'Открыть проблему в работе (Иван Кузнецов)',
        href: '/issues/iss_ce8abd2b',
      },
    },
    {
      num: 5,
      title: 'Исполнение и контрольный опрос новичка (re-check)',
      role: 'Наставник / Новичок',
      icon: RotateCcw,
      color: 'text-primary bg-primary/10 border-primary/20',
      description:
        'Ответственный вносит отчёт («Встреча проведена, регламент составлен»). Тикет переходит в PENDING_VERIFICATION, и генерируется персональная ссылка контрольного опроса новичка.',
      action: {
        label: 'Открыть проблему, ожидающую проверки (Полина Смирнова)',
        href: '/issues/iss_demo_polina_team',
      },
    },
    {
      num: 6,
      title: 'Строгий инвариант подтверждённого закрытия (≥ 4.0)',
      role: 'Система & Сотрудник',
      icon: CheckCircle2,
      color: 'text-status-success bg-status-success/10 border-status-success/20',
      description:
        'Главный инвариант системы: проблема переходит в CLOSED ТОЛЬКО если сотрудник в re-check поставил оценку ≥ 4.0. При оценке ≤ 3.0 тикет возвращается в работу с красным алертом.',
      action: {
        label: 'Открыть подтверждённую закрытую проблему (Анна Воронина)',
        href: '/issues/iss_edf842d1',
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Сценарии демонстрации Onboard Pulse (MVP)
              </h2>
              <p className="text-xs text-muted-foreground">
                Пошаговый путеводитель по полному жизненному циклу контроля адаптации новичков
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs">
          <div className="p-3 rounded-md bg-surface-secondary/70 border border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Демонстрационный контур: <strong>Синтетические данные сотрудников</strong> (Склад, Розничные магазины, Отдел продаж, Офис).
            </span>
            <button
              type="button"
              onClick={handleResetData}
              disabled={isResetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 border border-border text-xs shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Сбросить данные к началу</span>
            </button>
          </div>

          <div className="space-y-3">
            {scenarios.map((sc) => {
              const Icon = sc.icon;
              return (
                <div
                  key={sc.num}
                  className="p-4 rounded-lg bg-card border border-border shadow-xs hover:border-primary/40 transition-colors space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${sc.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-xs sm:text-sm">
                          Сценарий {sc.num}: {sc.title}
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Роль: {sc.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                    {sc.description}
                  </p>

                  <div className="pl-9 pt-1">
                    {sc.action.href ? (
                      sc.action.external ? (
                        <a
                          href={sc.action.href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={onClose}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover shadow-xs transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{sc.action.label}</span>
                        </a>
                      ) : (
                        <Link
                          href={sc.action.href}
                          onClick={onClose}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground font-semibold text-xs hover:bg-primary hover:text-primary-foreground transition-colors border border-border"
                        >
                          <span>{sc.action.label}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )
                    ) : sc.action.onClick ? (
                      <button
                        type="button"
                        onClick={sc.action.onClick}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover shadow-xs transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{sc.action.label}</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border bg-surface-secondary/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>Все 6 сценариев проверены автотестами и готовы к показу стейкхолдерам.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 border border-border"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

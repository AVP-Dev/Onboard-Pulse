'use client';

import React, { useState } from 'react';
import { Department, DEPARTMENTS } from '@/lib/types';
import { UserPlus, X, Check, Copy, ExternalLink } from 'lucide-react';

interface NewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function NewEmployeeModal({ isOpen, onClose, onCreated }: NewEmployeeModalProps) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<Department>('Склад');
  const [position, setPosition] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [hireDate, setHireDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdResult, setCreatedResult] = useState<{
    employeeName: string;
    token: string;
    url: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          department,
          position,
          mentor_name: mentorName,
          hire_date: hireDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при регистрации сотрудника');
      }

      setCreatedResult({
        employeeName: data.employee.name,
        token: data.firstSurveyToken,
        url: `${window.location.origin}/survey/${data.firstSurveyToken}`,
      });

      if (onCreated) onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (createdResult) {
      navigator.clipboard.writeText(createdResult.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetAndClose = () => {
    setName('');
    setPosition('');
    setMentorName('');
    setCreatedResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Регистрация нового сотрудника</h2>
              <p className="text-xs text-muted-foreground">Ввод в программу мониторинга первых 90 дней</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Закрыть"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {createdResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-sm font-medium flex items-center gap-2">
                <Check className="w-5 h-5 shrink-0" />
                <span>Сотрудник {createdResult.employeeName} успешно зарегистрирован!</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Персональная ссылка на первый пульс-опрос:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdResult.url}
                    className="flex-1 px-3 py-2 text-xs bg-muted border border-border rounded-md font-mono text-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium border border-border transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {copied ? <Check className="w-4 h-4 text-status-success" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Отправьте эту ссылку новичку в мессенджер или по почте. Ссылка одноразовая.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                <a
                  href={`/survey/${createdResult.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Открыть анкету
                </a>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  ФИО сотрудника *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Артём Васильев"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Подразделение *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Дата выхода *
                  </label>
                  <input
                    type="date"
                    required
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Должность *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Комплектовщик заказов"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Наставник / Руководитель *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Олег Васильев (Старший смены)"
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background border border-input text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSubmitting ? 'Регистрация...' : 'Зарегистрировать и создать опрос'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

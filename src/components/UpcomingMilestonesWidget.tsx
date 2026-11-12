'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Send, ArrowRight, Calendar } from 'lucide-react';
import { NewSurveyModal } from './NewSurveyModal';

interface MilestoneItem {
  id: string;
  name: string;
  department: string;
  days: number;
  nextMilestone: number;
  milestoneLabel: string;
  daysRemaining: number;
}

interface UpcomingMilestonesWidgetProps {
  milestones: MilestoneItem[];
  totalEmployeesCount: number;
}

export function UpcomingMilestonesWidget({
  milestones,
  totalEmployeesCount,
}: UpcomingMilestonesWidgetProps) {
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');

  const handleLaunchSurvey = (empId: string) => {
    setSelectedEmpId(empId);
    setSurveyModalOpen(true);
  };

  return (
    <>
      <div className="p-5 rounded-lg bg-card border border-border shadow-xs flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Предстоящие контрольные точки
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">Рубежи 14, 30, 60, 90 дней</span>
        </div>

        <div className="space-y-2.5 flex-1">
          {milestones.map((emp) => (
            <div
              key={emp.id}
              className="p-3 rounded-md bg-surface-secondary/60 border border-border flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <Link
                  href={`/employees/${emp.id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                >
                  {emp.name}
                </Link>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>{emp.department}</span>
                  <span>•</span>
                  <span>День {emp.days} из 90</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="text-[11px] font-semibold text-foreground block">
                    {emp.milestoneLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {emp.daysRemaining === 0 ? 'Сегодня' : `через ${emp.daysRemaining} дн.`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleLaunchSurvey(emp.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground font-semibold text-xs border border-border transition-colors"
                  title="Сформировать контрольный опрос"
                >
                  <Send className="w-3 h-3" />
                  <span className="hidden sm:inline">Опрос</span>
                </button>

                <Link
                  href={`/employees/${emp.id}`}
                  className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Открыть профиль"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
          <span>Всего новичков на контроле: {totalEmployeesCount}</span>
          <Link href="/employees" className="text-primary font-semibold hover:underline">
            Все сотрудники &rarr;
          </Link>
        </div>
      </div>

      <NewSurveyModal
        isOpen={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
        preselectedEmployeeId={selectedEmpId}
      />
    </>
  );
}

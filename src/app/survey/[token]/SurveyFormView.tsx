'use client';

import React, { useState } from 'react';
import { SurveyToken, Employee, Issue, Category, CATEGORIES, CATEGORY_LABELS } from '@/lib/types';
import { CheckCircle2, Send, AlertCircle, HeartHandshake } from 'lucide-react';

interface SurveyFormViewProps {
  tokenData: SurveyToken & { employee: Employee; issue?: Issue };
}

const RATING_STEPS: Record<number, { title: string; hint: string }> = {
  1: { title: '1', hint: 'Нужна помощь / трудности' },
  2: { title: '2', hint: 'Есть замечания' },
  3: { title: '3', hint: 'В целом нормально' },
  4: { title: '4', hint: 'Хорошо' },
  5: { title: '5', hint: 'Отлично' },
};

export function SurveyFormView({ tokenData }: SurveyFormViewProps) {
  const isVerification = tokenData.survey_type === 'VERIFICATION';
  const targetCategory = (tokenData.target_category || tokenData.issue?.category || 'training') as Category;

  // Ratings state for all 5 categories
  const [ratings, setRatings] = useState<Record<Category, number>>({
    training: 5,
    support: 5,
    conditions: 5,
    team: 5,
    workload: 5,
  });

  // Category specific comments if score <= 3
  const [categoryComments, setCategoryComments] = useState<Partial<Record<Category, string>>>({});
  const [generalComment, setGeneralComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const firstName = tokenData.employee.name.split(' ')[0] || tokenData.employee.name;

  const handleRatingChange = (cat: Category, val: number) => {
    setRatings((prev) => ({ ...prev, [cat]: val }));
  };

  const handleCategoryCommentChange = (cat: Category, text: string) => {
    setCategoryComments((prev) => ({ ...prev, [cat]: text }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/surveys/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenData.token,
          ratings,
          comment: generalComment.trim() || undefined,
          categoryComments: Object.keys(categoryComments).length > 0 ? categoryComments : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при отправке ответов');
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при отправке');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN (Calm Guided Officevibe style)
  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-lg bg-card border border-border shadow-xs text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-full bg-status-success/15 text-status-success flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Спасибо за обратную связь!
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Твои ответы успешно сохранены и помогут наставнику и руководству улучшить условия адаптации.
          </p>
        </div>

        <div className="p-4 rounded-md bg-surface-secondary border border-border text-xs text-left space-y-1 text-muted-foreground">
          <span className="font-semibold text-foreground block">Что происходит дальше?</span>
          <p>
            Если в каком-то вопросе возникли сложности, наставник или руководитель обсудят их с тобой на ближайшей смене.
          </p>
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          Опрос завершён. Эту вкладку можно закрыть.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Intro Header Card */}
      <div className="p-4 sm:p-6 rounded-lg bg-card border border-border shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-primary">Пульс адаптации</span>
          <span className="text-muted-foreground">{tokenData.employee.department}</span>
        </div>

        <h1 className="text-lg sm:text-xl font-bold text-foreground">
          Привет, {firstName}!
        </h1>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {isVerification ? (
            <>
              По твоему обращению в направлении «{CATEGORY_LABELS[targetCategory]}» были предприняты меры.
              Пожалуйста, оцени текущее положение дел.
            </>
          ) : (
            <>
              Опрос займёт 2 минуты. Твои честные ответы помогут наставнику и руководству поддержать тебя в первые недели работы.
            </>
          )}
        </p>

        {isVerification && tokenData.issue?.resolution_note && (
          <div className="p-3 rounded-md bg-surface-secondary border border-border text-xs text-foreground mt-2 space-y-0.5">
            <span className="text-muted-foreground block text-[11px]">Отчёт наставника о выполненных шагах:</span>
            <p className="font-medium italic">«{tokenData.issue.resolution_note}»</p>
          </div>
        )}
      </div>

      {/* Survey Questions Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isVerification ? (
          // Verification Mode (Single question)
          <div className="p-4 sm:p-5 rounded-lg bg-card border border-border shadow-xs space-y-3">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                Повторная проверка
              </span>
              <h2 className="text-sm font-bold text-foreground">
                {CATEGORY_LABELS[targetCategory]}
              </h2>
              <p className="text-xs text-muted-foreground">
                Насколько ты удовлетворён решением вопроса сейчас?
              </p>
            </div>

            {/* 1..5 Rating Buttons (Minimum 48px touch target for mobile) */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((val) => {
                const isSelected = ratings[targetCategory] === val;
                const meta = RATING_STEPS[val];
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleRatingChange(targetCategory, val)}
                    className={`min-h-[48px] flex flex-col items-center justify-center rounded-md border text-center transition-all focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                        : 'bg-card text-foreground border-border hover:bg-surface-secondary'
                    }`}
                  >
                    <span className="text-sm font-bold">{val}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-center text-xs text-muted-foreground font-medium pt-1">
              Выбрано: <strong className="text-foreground">{RATING_STEPS[ratings[targetCategory]]?.hint}</strong>
            </div>

            {ratings[targetCategory] <= 3 && (
              <div className="pt-2 border-t border-border space-y-1.5 animate-in fade-in">
                <label className="block text-xs font-semibold text-foreground">
                  Что ещё требует доработки? *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Опиши, что пока не решено или почему оценка невысокая..."
                  value={categoryComments[targetCategory] || ''}
                  onChange={(e) => handleCategoryCommentChange(targetCategory, e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md bg-surface-secondary border border-border text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
        ) : (
          // Regular Mode (5 Factors)
          <div className="space-y-3.5">
            {CATEGORIES.map((cat, idx) => {
              const currentVal = ratings[cat.id];
              const meta = RATING_STEPS[currentVal];
              const isLow = currentVal <= 3;

              return (
                <div
                  key={cat.id}
                  className="p-4 sm:p-5 rounded-lg bg-card border border-border shadow-xs space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary uppercase tracking-wider text-[11px]">
                        Вопрос {idx + 1} из 5
                      </span>
                      <span className="font-semibold text-foreground">
                        {meta.hint}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground">{cat.label}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
                  </div>

                  {/* 1..5 Buttons with minimum 48px height */}
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const isSelected = currentVal === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleRatingChange(cat.id, val)}
                          className={`min-h-[48px] flex items-center justify-center rounded-md border text-center transition-all focus-visible:ring-2 focus-visible:ring-primary ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                              : 'bg-card text-foreground border-border hover:bg-surface-secondary'
                          }`}
                        >
                          <span className="text-sm font-bold">{val}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Extrema labels */}
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                    <span>1 — Нужна помощь</span>
                    <span>5 — Всё отлично</span>
                  </div>

                  {/* Feedback field if rating is low (1..3) */}
                  {isLow && (
                    <div className="pt-2 border-t border-border space-y-1.5 animate-in fade-in">
                      <label className="block text-xs font-semibold text-foreground">
                        Поясни, пожалуйста, что вызвало трудности:
                      </label>
                      <input
                        type="text"
                        placeholder="Например: нет формы / наставник занят / не объяснили регламент"
                        value={categoryComments[cat.id] || ''}
                        onChange={(e) => handleCategoryCommentChange(cat.id, e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-md bg-surface-secondary border border-border text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* General Comment */}
        <div className="p-4 rounded-lg bg-card border border-border shadow-xs space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Общий комментарий или пожелание (необязательно)
          </label>
          <textarea
            rows={2}
            placeholder="Любые мысли, пожелания или вопросы к наставнику и компании..."
            value={generalComment}
            onChange={(e) => setGeneralComment(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-md bg-surface-secondary border border-border text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground leading-relaxed"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[48px] py-3 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover shadow-xs transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Отправка...' : 'Отправить отзыв'}</span>
        </button>
      </form>
    </div>
  );
}

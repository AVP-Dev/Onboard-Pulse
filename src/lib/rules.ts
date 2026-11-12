import { Category, IssueSeverity } from './types';

export interface ScoreSignal {
  category: Category;
  score: number;
  severity: IssueSeverity;
  reason: string;
}

/**
 * Transparent Rule Engine for evaluating newcomer onboarding pulse scores.
 * Strictly deterministic - NO LLM or heuristic black-boxes.
 *
 * Invariant:
 * - Scores 1..2 -> CRITICAL signal
 * - Score 3     -> ATTENTION signal
 * - Scores 4..5 -> NORMAL (no issue triggered)
 */
export function evaluateCategoryScore(category: Category, score: number): ScoreSignal | null {
  if (score < 1 || score > 5 || !Number.isInteger(score)) {
    throw new Error(`Invalid score: ${score}. Score must be an integer between 1 and 5.`);
  }

  if (score <= 2) {
    return {
      category,
      score,
      severity: 'CRITICAL',
      reason: `Критически низкая оценка (${score}/5). Требуется немедленное вмешательство наставника/руководителя.`,
    };
  }

  if (score === 3) {
    return {
      category,
      score,
      severity: 'ATTENTION',
      reason: `Пограничная оценка (${score}/5). Зона скрытого риска адаптации, требуется внимание и контакт с сотрудником.`,
    };
  }

  return null;
}

/**
 * Evaluates all 5 pulse categories for a given survey submission.
 */
export function evaluateSurveyRatings(ratings: Record<Category, number>): ScoreSignal[] {
  const signals: ScoreSignal[] = [];
  const categories: Category[] = ['training', 'support', 'conditions', 'team', 'workload'];

  for (const cat of categories) {
    const score = ratings[cat];
    if (score !== undefined) {
      const signal = evaluateCategoryScore(cat, score);
      if (signal) {
        signals.push(signal);
      }
    }
  }

  return signals;
}

/**
 * Closure Invariant Check:
 * An issue can be closed ONLY if re-check verification score is 4 or 5.
 * If score is <= 3, the issue MUST NOT be closed and must return to IN_PROGRESS.
 */
export function canCloseIssue(verificationScore: number): { allowed: boolean; reason: string } {
  if (verificationScore >= 4) {
    return {
      allowed: true,
      reason: `Повторная оценка сотрудника (${verificationScore}/5) подтвердила успешное устранение проблемы.`,
    };
  }

  return {
    allowed: false,
    reason: `Повторная оценка (${verificationScore}/5) не подтвердила решение. Проблема возвращается в работу.`,
  };
}

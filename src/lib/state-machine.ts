import { IssueStatus } from './types';
import { canCloseIssue } from './rules';

export interface TransitionResult {
  success: boolean;
  newStatus: IssueStatus;
  message: string;
}

/**
 * Valid transitions between issue states:
 *
 * NEW -> IN_PROGRESS (Assign action and responsible)
 * IN_PROGRESS -> PENDING_VERIFICATION (Responsible marked action completed)
 * PENDING_VERIFICATION -> CLOSED (Re-check score >= 4)
 * PENDING_VERIFICATION -> IN_PROGRESS (Re-check score <= 3, rollback to work)
 * CLOSED -> IN_PROGRESS (Manual reopen by HR if needed)
 */
export const ALLOWED_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  NEW: ['IN_PROGRESS'],
  IN_PROGRESS: ['PENDING_VERIFICATION', 'IN_PROGRESS'],
  PENDING_VERIFICATION: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['IN_PROGRESS'],
};

export function isValidTransition(from: IssueStatus, to: IssueStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Applies transition with domain guards.
 */
export function transitionIssue(
  currentStatus: IssueStatus,
  targetStatus: IssueStatus,
  context?: {
    assigneeName?: string;
    actionPlan?: string;
    resolutionNote?: string;
    verificationScore?: number;
  }
): TransitionResult {
  if (currentStatus === targetStatus) {
    if (currentStatus === 'IN_PROGRESS') {
      if (!context?.assigneeName?.trim() || !context?.actionPlan?.trim()) {
        return {
          success: false,
          newStatus: currentStatus,
          message: 'Для обновления проблемы необходимо указать ответственное лицо и план действий.',
        };
      }
      return {
        success: true,
        newStatus: 'IN_PROGRESS',
        message: 'План действий и ответственный успешно обновлены.',
      };
    }
    return {
      success: false,
      newStatus: currentStatus,
      message: `Статус уже равен ${currentStatus}.`,
    };
  }

  if (!isValidTransition(currentStatus, targetStatus)) {
    return {
      success: false,
      newStatus: currentStatus,
      message: `Недопустимый переход из '${currentStatus}' в '${targetStatus}'.`,
    };
  }

  // Guard for NEW -> IN_PROGRESS
  if (currentStatus === 'NEW' && targetStatus === 'IN_PROGRESS') {
    if (!context?.assigneeName?.trim() || !context?.actionPlan?.trim()) {
      return {
        success: false,
        newStatus: currentStatus,
        message: 'Для взятия проблемы в работу необходимо указать ответственное лицо и план действий.',
      };
    }
  }

  // Guard for IN_PROGRESS -> PENDING_VERIFICATION
  if (currentStatus === 'IN_PROGRESS' && targetStatus === 'PENDING_VERIFICATION') {
    if (!context?.resolutionNote?.trim()) {
      return {
        success: false,
        newStatus: currentStatus,
        message: 'Для отправки на верификацию ответственный обязан зафиксировать отчёт о выполнении.',
      };
    }
  }

  // Guard for PENDING_VERIFICATION -> CLOSED vs IN_PROGRESS
  if (currentStatus === 'PENDING_VERIFICATION') {
    if (targetStatus === 'CLOSED') {
      if (context?.verificationScore === undefined) {
        return {
          success: false,
          newStatus: currentStatus,
          message: 'Невозможно закрыть проблему без оценки повторной проверки сотрудником.',
        };
      }

      const closureCheck = canCloseIssue(context.verificationScore);
      if (!closureCheck.allowed) {
        return {
          success: false,
          newStatus: currentStatus,
          message: closureCheck.reason,
        };
      }
    }
  }

  return {
    success: true,
    newStatus: targetStatus,
    message: `Статус успешно изменен на '${targetStatus}'.`,
  };
}

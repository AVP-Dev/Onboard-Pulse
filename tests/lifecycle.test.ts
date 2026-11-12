import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase } from '../src/db/index';
import { Repository } from '../src/lib/repository';

describe('Integration: Full Onboard Pulse Lifecycle & Invariants', () => {
  // Use in-memory SQLite for super-fast clean integration test
  const db = initDatabase(':memory:');
  const repo = new Repository(db);

  let employeeId: string;
  let regularToken: string;
  let trainingIssueId: string;

  it('Step 1: HR registers a new employee', () => {
    const emp = repo.createEmployee({
      name: 'Константин Беляев',
      department: 'Отдел продаж',
      position: 'Менеджер по тендерам',
      hire_date: '2026-03-01',
      mentor_name: 'Светлана Игнатьева',
    });

    assert.ok(emp.id);
    assert.equal(emp.name, 'Константин Беляев');
    assert.equal(emp.department, 'Отдел продаж');
    employeeId = emp.id;
  });

  it('Step 2: Generate personal survey link (single-use token)', () => {
    const tokenObj = repo.createSurveyToken(employeeId, 'REGULAR');
    assert.ok(tokenObj.token);
    assert.equal(tokenObj.is_completed, 0);
    regularToken = tokenObj.token;

    const fetched = repo.getSurveyToken(regularToken);
    assert.ok(fetched);
    assert.equal(fetched.employee.name, 'Константин Беляев');
  });

  it('Step 3 & 4: Newcomer submits survey ratings and system saves answers', () => {
    const result = repo.submitSurveyResponse({
      token: regularToken,
      ratings: {
        training: 1,    // CRITICAL
        support: 2,     // CRITICAL
        conditions: 4,  // NORMAL
        team: 4,        // NORMAL
        workload: 3,    // ATTENTION
      },
      comment: 'Обучение по тендерным площадкам отсутствует, наставник перегружен своими сделками.',
    });

    assert.equal(result.success, true);
    assert.equal(result.createdIssues.length, 3); // 2 critical, 1 attention

    const trainIssue = result.createdIssues.find(i => i.category === 'training');
    assert.ok(trainIssue);
    assert.equal(trainIssue.severity, 'CRITICAL');
    assert.equal(trainIssue.status, 'NEW');
    trainingIssueId = trainIssue.id;
  });

  it('Step 5: Resubmission with the same token is strictly prohibited', () => {
    assert.throws(
      () => {
        repo.submitSurveyResponse({
          token: regularToken,
          ratings: { training: 5, support: 5, conditions: 5, team: 5, workload: 5 },
          comment: 'Повторная попытка',
        });
      },
      {
        message: /Повторная отправка запрещена/,
      }
    );
  });

  it('Step 6: Subsequent survey does NOT create duplicate open issues for same category', () => {
    // Generate new second token
    const token2 = repo.createSurveyToken(employeeId, 'REGULAR');

    const result2 = repo.submitSurveyResponse({
      token: token2.token,
      ratings: {
        training: 2,    // CRITICAL again
        support: 5,     // Now fine
        conditions: 4,
        team: 4,
        workload: 4,
      },
      comment: 'По обучению ситуация не изменилась.',
    });

    // training issue should be updated, NOT duplicated
    assert.equal(result2.createdIssues.length, 0); // No new issues created!
    assert.equal(result2.updatedIssues.length, 1);
    assert.equal(result2.updatedIssues[0].category, 'training');

    const allIssues = repo.getIssues({ department: 'Отдел продаж' });
    const trainingIssues = allIssues.filter(i => i.employee_id === employeeId && i.category === 'training');
    assert.equal(trainingIssues.length, 1, 'Should have exactly 1 open training issue, no duplicates');
  });

  it('Step 7: HR assigns responsible person and action plan -> moves to IN_PROGRESS', () => {
    const updated = repo.assignAction({
      issueId: trainingIssueId,
      assigneeName: 'Светлана Игнатьева',
      assigneeRole: 'Руководитель группы тендеров',
      actionPlan: 'Провести 2 практических воркшопа по ЕИС и выдать регламент подачи заявок.',
      dueDate: '2026-03-15',
      actor: 'HR-менеджер',
    });

    assert.equal(updated.status, 'IN_PROGRESS');
    assert.equal(updated.assignee_name, 'Светлана Игнатьева');
  });

  let verificationToken: string;

  it('Step 8: Responsible records completion -> moves to PENDING_VERIFICATION', () => {
    const res = repo.completeAction({
      issueId: trainingIssueId,
      resolutionNote: 'Воркшопы проведены, тестовая заявка успешно сформирована сотрудником.',
      actor: 'Светлана Игнатьева',
    });

    assert.equal(res.issue.status, 'PENDING_VERIFICATION');
    assert.ok(res.verificationToken);
    verificationToken = res.verificationToken;
  });

  it('Step 9 & 10 (Negative Path): Employee gives low verification score -> issue returns to IN_PROGRESS', () => {
    repo.submitSurveyResponse({
      token: verificationToken,
      ratings: {
        training: 2, // Low score! Still having trouble
        support: 4,
        conditions: 4,
        team: 4,
        workload: 4,
      },
      comment: 'Воркшоп был поверхностный, реальную заявку подать сам всё ещё не могу.',
    });

    const issue = repo.getIssueById(trainingIssueId);
    assert.ok(issue);
    assert.equal(issue.status, 'IN_PROGRESS', 'Issue MUST return to IN_PROGRESS when verification score <= 3');
    assert.equal(issue.verification_score, 2);

    // Audit log should show RECHECK_FAILED
    const failLog = issue.logs.find(l => l.action === 'RECHECK_FAILED');
    assert.ok(failLog);
    assert.match(failLog.details, /НЕ решена/);
  });

  it('Step 9 & 10 (Positive Path): Responsible completes again, employee rates 5/5 -> issue CLOSES', () => {
    // Responsible does additional action
    const complete2 = repo.completeAction({
      issueId: trainingIssueId,
      resolutionNote: 'Выделен персональный наставник на 5 рабочих дней для совместной подачи первых трёх реальных заявок.',
      actor: 'Светлана Игнатьева',
    });

    assert.equal(complete2.issue.status, 'PENDING_VERIFICATION');

    // Employee passes with 5/5
    repo.submitSurveyResponse({
      token: complete2.verificationToken,
      ratings: {
        training: 5, // High score!
        support: 5,
        conditions: 5,
        team: 5,
        workload: 4,
      },
      comment: 'Отлично! С наставником подали 2 тендера, теперь всё понятно и уверенно.',
    });

    const closedIssue = repo.getIssueById(trainingIssueId);
    assert.ok(closedIssue);
    assert.equal(closedIssue.status, 'CLOSED', 'Issue MUST be CLOSED when verification score >= 4');
    assert.equal(closedIssue.verification_score, 5);
    assert.ok(closedIssue.closed_at);

    const passLog = closedIssue.logs.find(l => l.action === 'RECHECK_PASSED');
    assert.ok(passLog);
  });
});

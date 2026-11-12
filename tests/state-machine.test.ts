import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { transitionIssue, isValidTransition } from '../src/lib/state-machine';

describe('State Machine: Issue Lifecycle', () => {
  it('allows valid forward transition from NEW to IN_PROGRESS when assignee and plan provided', () => {
    const res = transitionIssue('NEW', 'IN_PROGRESS', {
      assigneeName: 'Иван Сергеев',
      actionPlan: 'Выдать форму и обувь',
    });
    assert.equal(res.success, true);
    assert.equal(res.newStatus, 'IN_PROGRESS');
  });

  it('rejects NEW to IN_PROGRESS if assignee or plan is missing', () => {
    const resNoPlan = transitionIssue('NEW', 'IN_PROGRESS', {
      assigneeName: 'Иван Сергеев',
      actionPlan: '',
    });
    assert.equal(resNoPlan.success, false);

    const resNoAssignee = transitionIssue('NEW', 'IN_PROGRESS', {
      assigneeName: '',
      actionPlan: 'План есть',
    });
    assert.equal(resNoAssignee.success, false);
  });

  it('allows IN_PROGRESS to PENDING_VERIFICATION only with resolution note', () => {
    const resFail = transitionIssue('IN_PROGRESS', 'PENDING_VERIFICATION', {
      resolutionNote: '',
    });
    assert.equal(resFail.success, false);

    const resOk = transitionIssue('IN_PROGRESS', 'PENDING_VERIFICATION', {
      resolutionNote: 'Форма выдана, сотрудником расписано',
    });
    assert.equal(resOk.success, true);
    assert.equal(resOk.newStatus, 'PENDING_VERIFICATION');
  });

  it('forbids closing directly from NEW or IN_PROGRESS', () => {
    assert.equal(isValidTransition('NEW', 'CLOSED'), false);
    assert.equal(isValidTransition('IN_PROGRESS', 'CLOSED'), false);

    const directClose = transitionIssue('NEW', 'CLOSED');
    assert.equal(directClose.success, false);
  });

  it('allows PENDING_VERIFICATION to CLOSED only if verification score >= 4', () => {
    const resLow = transitionIssue('PENDING_VERIFICATION', 'CLOSED', {
      verificationScore: 3,
    });
    assert.equal(resLow.success, false);
    assert.match(resLow.message, /не подтвердила/);

    const resHigh = transitionIssue('PENDING_VERIFICATION', 'CLOSED', {
      verificationScore: 4,
    });
    assert.equal(resHigh.success, true);
    assert.equal(resHigh.newStatus, 'CLOSED');
  });

  it('allows rolling back from PENDING_VERIFICATION to IN_PROGRESS', () => {
    const resRollback = transitionIssue('PENDING_VERIFICATION', 'IN_PROGRESS');
    assert.equal(resRollback.success, true);
    assert.equal(resRollback.newStatus, 'IN_PROGRESS');
  });
});

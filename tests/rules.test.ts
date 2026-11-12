import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCategoryScore, evaluateSurveyRatings, canCloseIssue } from '../src/lib/rules';

describe('Rule Engine: Pulse Score Evaluation', () => {
  it('identifies scores 1 and 2 as CRITICAL signals', () => {
    const res1 = evaluateCategoryScore('conditions', 1);
    assert.ok(res1);
    assert.equal(res1.severity, 'CRITICAL');
    assert.equal(res1.score, 1);

    const res2 = evaluateCategoryScore('training', 2);
    assert.ok(res2);
    assert.equal(res2.severity, 'CRITICAL');
    assert.equal(res2.score, 2);
  });

  it('identifies score 3 as ATTENTION signal', () => {
    const res3 = evaluateCategoryScore('support', 3);
    assert.ok(res3);
    assert.equal(res3.severity, 'ATTENTION');
    assert.equal(res3.score, 3);
  });

  it('treats scores 4 and 5 as NORMAL (no signal)', () => {
    const res4 = evaluateCategoryScore('team', 4);
    assert.equal(res4, null);

    const res5 = evaluateCategoryScore('workload', 5);
    assert.equal(res5, null);
  });

  it('rejects scores out of bounds', () => {
    assert.throws(() => evaluateCategoryScore('training', 0));
    assert.throws(() => evaluateCategoryScore('training', 6));
    assert.throws(() => evaluateCategoryScore('training', 3.5));
  });

  it('evaluates entire survey submission and detects multiple signals', () => {
    const ratings = {
      training: 1,  // CRITICAL
      support: 3,   // ATTENTION
      conditions: 5,// NORMAL
      team: 2,      // CRITICAL
      workload: 4,  // NORMAL
    };

    const signals = evaluateSurveyRatings(ratings);
    assert.equal(signals.length, 3);

    const criticals = signals.filter(s => s.severity === 'CRITICAL');
    assert.equal(criticals.length, 2);
    assert.ok(criticals.some(s => s.category === 'training'));
    assert.ok(criticals.some(s => s.category === 'team'));

    const attentions = signals.filter(s => s.severity === 'ATTENTION');
    assert.equal(attentions.length, 1);
    assert.equal(attentions[0].category, 'support');
  });

  it('strictly validates closure invariant based on verification score', () => {
    // 4 and 5 can close
    assert.equal(canCloseIssue(4).allowed, true);
    assert.equal(canCloseIssue(5).allowed, true);

    // 1, 2, 3 CANNOT close
    assert.equal(canCloseIssue(3).allowed, false);
    assert.equal(canCloseIssue(2).allowed, false);
    assert.equal(canCloseIssue(1).allowed, false);
  });
});

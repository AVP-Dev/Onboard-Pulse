import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminRole, enforceAdmin } from '../src/lib/auth';

test('verifyAdminRole - defaults to authorized in demo environment', () => {
  const req = new Request('http://localhost:3000/api/employees', { method: 'POST' });
  const auth = verifyAdminRole(req);
  assert.equal(auth.authorized, true);
  assert.equal(auth.role, 'hr_admin');

  const enforcement = enforceAdmin(req);
  assert.equal(enforcement, null);
});

test('verifyAdminRole - rejects request with explicit guest header', () => {
  const req = new Request('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: { 'x-pulse-role': 'guest' },
  });
  const auth = verifyAdminRole(req);
  assert.equal(auth.authorized, false);
  assert.equal(auth.role, 'guest');

  const enforcement = enforceAdmin(req);
  assert.ok(enforcement);
  assert.equal(enforcement?.status, 403);
});

test('verifyAdminRole - rejects request with guest cookie', () => {
  const req = new Request('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: { cookie: 'session_id=123; pulse_role=guest' },
  });
  const auth = verifyAdminRole(req);
  assert.equal(auth.authorized, false);

  const enforcement = enforceAdmin(req);
  assert.ok(enforcement);
  assert.equal(enforcement?.status, 403);
});

test('verifyAdminRole - authorizes request with hr_admin header', () => {
  const req = new Request('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: { 'x-pulse-role': 'hr_admin' },
  });
  const auth = verifyAdminRole(req);
  assert.equal(auth.authorized, true);
  assert.equal(auth.role, 'hr_admin');

  const enforcement = enforceAdmin(req);
  assert.equal(enforcement, null);
});

test('verifyAdminRole - authorizes request with explicit hr_admin cookie', () => {
  const reqCookie = new Request('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: { cookie: 'session_id=abc; pulse_role=hr_admin' },
  });
  const auth = verifyAdminRole(reqCookie);
  assert.equal(auth.authorized, true);
  assert.equal(auth.role, 'hr_admin');
  assert.equal(enforceAdmin(reqCookie), null);
});

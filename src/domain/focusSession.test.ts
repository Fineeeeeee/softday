import assert from 'node:assert/strict';
import test from 'node:test';
import { clearFocusForItem, getFocusElapsedMinutes, keepValidFocusSession, startFocusSession } from './focusSession.ts';
import type { PlanItem } from '../types/index.ts';

const item: PlanItem = { id: 'a', title: '写一封邮件', duration: '10 分钟', section: 'important' };

test('focus session records one item and survives while that item is active', () => {
  const session = startFocusSession(item, new Date('2026-07-23T12:00:00.000Z'));
  assert.deepEqual(session, { itemId: 'a', startedAt: '2026-07-23T12:00:00.000Z' });
  assert.equal(keepValidFocusSession(session, [item]), session);
  assert.equal(getFocusElapsedMinutes(session, new Date('2026-07-23T12:09:59.000Z')), 9);
});

test('focus session clears when its task completes, waits, or moves away', () => {
  const session = startFocusSession(item);
  assert.equal(keepValidFocusSession(session, [{ ...item, done: true }]), null);
  assert.equal(keepValidFocusSession(session, [{ ...item, waitingFor: '回复' }]), null);
  assert.equal(keepValidFocusSession(session, []), null);
  assert.equal(clearFocusForItem(session, item.id), null);
});

test('starting another item replaces the current focus without changing either item', () => {
  const other: PlanItem = { id: 'b', title: '整理桌面', duration: '5 分钟', section: 'wanted' };
  const originalItem = { ...item };
  const originalOther = { ...other };

  const first = startFocusSession(item, new Date('2026-07-23T12:00:00.000Z'));
  const next = startFocusSession(other, new Date('2026-07-23T12:05:00.000Z'));

  assert.equal(first.itemId, 'a');
  assert.equal(next.itemId, 'b');
  assert.deepEqual(item, originalItem);
  assert.deepEqual(other, originalOther);
});

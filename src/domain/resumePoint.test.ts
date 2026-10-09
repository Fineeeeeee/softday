import assert from 'node:assert/strict';
import test from 'node:test';
import { applyResumePointDraft, createLocalResumePointDraft } from './resumePoint.ts';
import type { PlanItem } from '../types/index.ts';

const item: PlanItem = { id: 'form', title: '提交报名表', duration: '20 分钟', section: 'important' };

test('local resume point records a simple pause without inventing progress', () => {
  const draft = createLocalResumePointDraft(item, 'in_progress', '照片已经准备好了');
  assert.equal(draft.progressSummary, '照片已经准备好了');
  assert.equal(draft.nextAction, item.title);
});

test('waiting resume point keeps the condition and exact recorded moment', () => {
  const draft = createLocalResumePointDraft(item, 'waiting', '等老师回复');
  const next = applyResumePointDraft(item, draft, new Date('2026-07-20T21:30:00.000Z'));
  assert.equal(next.waitingFor, '等老师回复');
  assert.equal(next.resumePoint?.recordedAt, '2026-07-20T21:30:00.000Z');
});

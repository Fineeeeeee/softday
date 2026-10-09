import assert from 'node:assert/strict';
import test from 'node:test';
import { createFileImportDraftFromAi, createIdeasFromImportedTasks, filterNewImportedTasks, isSupportedTextFile, unsupportedFileReason } from './fileImport.ts';

const documents = [{ id: 'file-0', name: '课程要求.md', text: '请在 7 月 20 日前提交报名表。提交前准备身份证复印件。' }];

test('file import accepts text formats and explains unsupported files', () => {
  assert.equal(isSupportedTextFile('notes.md'), true);
  assert.equal(isSupportedTextFile('data.bin', 'text/plain'), true);
  assert.equal(isSupportedTextFile('brief.pdf', 'application/pdf'), false);
  assert.match(unsupportedFileReason('brief.pdf'), /PDF/);
});

test('file import validates source excerpts and deduplicates titles', () => {
  const draft = createFileImportDraftFromAi({ items: [
    { title: '提交报名表', sourceId: 'file-0', sourceExcerpt: '7 月 20 日前提交报名表', timing: 'week', section: 'important', durationMinutes: 20, deadline: '2026-07-20', timeSlot: 'anytime', afterTitle: null },
    { title: '提交报名表', sourceId: 'file-0', sourceExcerpt: '提交报名表', timing: 'week', section: 'important', durationMinutes: 20, deadline: '2026-07-20', timeSlot: 'anytime', afterTitle: null },
    { title: '准备身份证复印件', sourceId: 'file-0', sourceExcerpt: '准备身份证复印件', timing: 'week', section: 'wanted', durationMinutes: 10, deadline: null, timeSlot: 'anytime', afterTitle: '提交报名表' },
  ] }, documents);
  assert.equal(draft?.items.length, 2);
  assert.equal(draft?.items[1]?.afterTitle, '提交报名表');
});

test('file import rejects invented source text', () => {
  assert.equal(createFileImportDraftFromAi({ items: [{ title: '联系老师', sourceId: 'file-0', sourceExcerpt: '联系老师', timing: 'week', section: 'wanted', durationMinutes: 10, deadline: null, timeSlot: 'anytime', afterTitle: null }] }, documents), null);
});

test('confirmed file tasks become source-linked ideas without raw documents', () => {
  const draft = createFileImportDraftFromAi({ items: [{ title: '提交报名表', sourceId: 'file-0', sourceExcerpt: '提交报名表', timing: 'week', section: 'important', durationMinutes: 20, deadline: '2026-07-20', timeSlot: 'afternoon', afterTitle: null }] }, documents);
  const ideas = createIdeasFromImportedTasks(draft?.items ?? [], new Date(2026, 6, 15, 12));
  assert.equal(ideas[0]?.sourceName, '课程要求.md');
  assert.equal(ideas[0]?.deadline, '2026-07-20');
  assert.equal('text' in (ideas[0] ?? {}), false);
});

test('reimporting the same task does not create another local idea', () => {
  const items = createFileImportDraftFromAi({ items: [{ title: '提交报名表', sourceId: 'file-0', sourceExcerpt: '提交报名表', timing: 'week', section: 'important', durationMinutes: 20, deadline: '2026-07-20', timeSlot: 'anytime', afterTitle: null }] }, documents)?.items ?? [];
  assert.equal(filterNewImportedTasks(items, ['提交报名表']).length, 0);
  assert.equal(filterNewImportedTasks(items, ['其他事情']).length, 1);
});

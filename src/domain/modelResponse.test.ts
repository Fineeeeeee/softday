import assert from 'node:assert/strict';
import test from 'node:test';
import { parseModelJson, readModelText } from './modelResponse.ts';

test('reads text from compatible chat content formats', () => {
  assert.equal(readModelText(' OK '), 'OK');
  assert.equal(readModelText([{ type: 'text', text: '{"ok":' }, { type: 'text', text: 'true}' }]), '{"ok":true}');
});

test('parses fenced JSON and ignores short surrounding prose', () => {
  assert.deepEqual(parseModelJson('```json\n{"ok":true}\n```'), { ok: true });
  assert.deepEqual(parseModelJson('结果：{"ok":true}'), { ok: true });
  assert.throws(() => parseModelJson('<html>bad gateway</html>'), /内容不完整/);
});

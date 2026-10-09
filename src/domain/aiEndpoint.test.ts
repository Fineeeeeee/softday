import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAiChatEndpoint, validateAiEndpoint } from './aiEndpoint.ts';

test('AI endpoint accepts a public HTTPS base URL', () => {
  assert.deepEqual(validateAiEndpoint('https://api.example.com/v1/'), { valid: true, value: 'https://api.example.com/v1/' });
  assert.deepEqual(validateAiEndpoint('https://api.example.com/custom/generate'), { valid: true, value: 'https://api.example.com/custom/generate' });
  assert.deepEqual(validateAiEndpoint('https://api.example.com/v1/chat/completions'), { valid: true, value: 'https://api.example.com/v1/chat/completions' });
});

test('AI chat endpoint appends the route once', () => {
  assert.deepEqual(resolveAiChatEndpoint('https://api.example.com/v1'), { valid: true, value: 'https://api.example.com/v1/chat/completions' });
  assert.deepEqual(resolveAiChatEndpoint('https://api.example.com/v1/'), { valid: true, value: 'https://api.example.com/v1/chat/completions' });
  assert.deepEqual(resolveAiChatEndpoint('https://api.example.com/v1/chat/completions'), { valid: true, value: 'https://api.example.com/v1/chat/completions' });
});

test('AI endpoint rejects non-public and non-HTTPS addresses', () => {
  for (const value of ['http://api.example.com/v1', 'https://localhost:3000/v1', 'https://127.0.0.1/v1', 'https://192.168.1.3/v1', 'https://[::1]/v1']) {
    assert.equal(validateAiEndpoint(value).valid, false);
  }
});

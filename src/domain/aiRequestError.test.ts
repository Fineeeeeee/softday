import assert from 'node:assert/strict';
import test from 'node:test';
import { isCanceledRequestError, isNetworkRequestError } from './aiRequestError.ts';

test('recognizes React Native canceled fetch errors', () => {
  assert.equal(isCanceledRequestError(new TypeError('fetch failed: fetch request has been canceled')), true);
  assert.equal(isCanceledRequestError(new DOMException('Aborted', 'AbortError')), true);
  assert.equal(isCanceledRequestError(new Error('Network request failed')), false);
});

test('recognizes transport failures without treating every error as network trouble', () => {
  assert.equal(isNetworkRequestError(new TypeError('fetch failed')), true);
  assert.equal(isNetworkRequestError(new TypeError('Network request failed')), true);
  assert.equal(isNetworkRequestError(new Error('智能服务返回的内容不完整')), false);
});

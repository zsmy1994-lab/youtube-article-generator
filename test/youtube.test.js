import test from 'node:test';
import assert from 'node:assert/strict';

import { __clearCaptionCache, __seedCaptionCache, extractVideoId, fetchYouTubeCaptions, formatCaptions } from '../src/services/youtube.js';

// --- extractVideoId ---

test('extractVideoId parses watch url', () => {
  assert.equal(extractVideoId('https://www.youtube.com/watch?v=OEV8gMkCHXQ'), 'OEV8gMkCHXQ');
});

test('extractVideoId parses short url', () => {
  assert.equal(extractVideoId('https://youtu.be/OEV8gMkCHXQ'), 'OEV8gMkCHXQ');
});

test('extractVideoId parses shorts url', () => {
  assert.equal(extractVideoId('https://www.youtube.com/shorts/OEV8gMkCHXQ'), 'OEV8gMkCHXQ');
});

test('extractVideoId accepts bare 11-char video id', () => {
  assert.equal(extractVideoId('OEV8gMkCHXQ'), 'OEV8gMkCHXQ');
});

test('extractVideoId returns null for invalid input', () => {
  assert.equal(extractVideoId('https://example.com/video'), null);
});

// --- formatCaptions ---

test('formatCaptions merges nearby caption fragments', () => {
  const result = formatCaptions([
    { offset: 0, duration: 1000, text: 'hello' },
    { offset: 1300, duration: 1000, text: 'world' },
  ]);

  assert.equal(result, '[00:00:00] hello world');
});

test('formatCaptions keeps distant blocks separate', () => {
  const result = formatCaptions([
    { offset: 1500, duration: 1000, text: 'hello.' },
    { offset: 125000, duration: 1000, text: 'world' },
  ]);

  assert.equal(result, '[00:00:01] hello.\n[00:02:05] world');
});

test('formatCaptions merges fragmented chinese subtitle chunks', () => {
  const result = formatCaptions([
    { offset: 0, duration: 1000, text: '神经网络作为学术和前' },
    { offset: 1100, duration: 1000, text: '沿研究的领域，' },
    { offset: 2200, duration: 1000, text: '经历了数十年的过度乐观与失望。' },
  ]);

  assert.equal(result, '[00:00:00] 神经网络作为学术和前沿研究的领域，经历了数十年的过度乐观与失望。');
});

// --- fetchYouTubeCaptions (cache) ---

test('fetchYouTubeCaptions returns cached captions', async () => {
  __clearCaptionCache();
  __seedCaptionCache('demoVideo01A', [{ offset: 0, duration: 1000, text: 'cached line' }]);

  const captions = await fetchYouTubeCaptions('demoVideo01A');

  assert.deepEqual(captions, [{ offset: 0, duration: 1000, text: 'cached line' }]);
});

test('fetchYouTubeCaptions ignores expired cache and falls through to fetch', async () => {
  __clearCaptionCache();
  __seedCaptionCache('demoVideo02B', [{ offset: 0, duration: 1000, text: 'expired' }], -1);

  await assert.rejects(() => fetchYouTubeCaptions('demoVideo02B'));
});

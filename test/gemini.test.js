import test from 'node:test';
import assert from 'node:assert/strict';

import { buildArticlePrompt, normalizeGeneratedHtml } from '../src/services/gemini.js';
import { renderHomePage } from '../src/ui/home-page.js';

// --- buildArticlePrompt ---

test('buildArticlePrompt embeds caption text and html output constraints', () => {
  const prompt = buildArticlePrompt('[00:00:00] demo');

  assert.match(prompt, /\[00:00:00\] demo/);
  assert.match(prompt, /直接输出 HTML 片段/);
  assert.match(prompt, /<h1>/);
  assert.match(prompt, /<blockquote>/);
});

// --- normalizeGeneratedHtml ---

test('normalizeGeneratedHtml decodes html entities', () => {
  assert.equal(
    normalizeGeneratedHtml('&lt;h1&gt;标题&lt;/h1&gt;'),
    '<h1>标题</h1>',
  );
});

test('normalizeGeneratedHtml strips br tags', () => {
  assert.equal(
    normalizeGeneratedHtml('<p>你好<br/>世界</p>'),
    '<p>你好世界</p>',
  );
});

test('normalizeGeneratedHtml removes spaces between chinese characters', () => {
  assert.equal(
    normalizeGeneratedHtml('<p>人工 智能 革命</p>'),
    '<p>人工智能革命</p>',
  );
});

test('normalizeGeneratedHtml removes spaces before chinese punctuation', () => {
  assert.equal(
    normalizeGeneratedHtml('<p>你好 ，世界 。</p>'),
    '<p>你好，世界。</p>',
  );
});

test('normalizeGeneratedHtml merges orphan speaker label into following paragraph', () => {
  const input = '<p><strong>主持人</strong></p>\n<p>你好吗</p>';
  const result = normalizeGeneratedHtml(input);

  assert.match(result, /<p><strong>主持人：<\/strong>你好吗<\/p>/);
});

// --- renderHomePage ---

test('renderHomePage renders input form and generate api route', () => {
  const html = renderHomePage();

  assert.match(html, /id="videoUrl"/);
  assert.match(html, /id="generateBtn"/);
  assert.match(html, /\/api\/generate/);
});

test('renderHomePage shows error when gemini key is missing', () => {
  assert.match(renderHomePage({ hasGeminiKey: false }), /未配置 GEMINI_API_KEY/);
});

test('renderHomePage does not show error when gemini key is present', () => {
  assert.doesNotMatch(renderHomePage({ hasGeminiKey: true }), /未配置 GEMINI_API_KEY/);
});

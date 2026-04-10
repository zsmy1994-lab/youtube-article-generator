const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CANDIDATE_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemma-3-4b-it',
];
const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const MAX_ATTEMPTS_PER_MODEL = 2;

export async function generateArticleStream(captionsText, apiKey) {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: buildArticlePrompt(captionsText) }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 32768,
    },
  });

  const errors = [];

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
      const response = await fetch(`${GEMINI_API_BASE}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (response.ok) {
        return response;
      }

      const detail = await response.text();
      errors.push(`model=${model}, attempt=${attempt}, status=${response.status}, detail=${detail}`);

      if (!RETRYABLE_STATUS_CODES.has(response.status)) {
        break;
      }

      if (attempt < MAX_ATTEMPTS_PER_MODEL) {
        await delay(getRetryDelayMs(detail, attempt));
      }
    }
  }

  throw new Error(`Gemini API 重试后仍失败: ${errors.join(' | ')}`);
}

export async function parseGeminiSseStream(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        consumeGeminiBuffer(buffer, onChunk, true);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = await consumeGeminiBuffer(buffer, onChunk, false);
    }
  } finally {
    reader.releaseLock();
  }
}

export function buildArticlePrompt(captionsText) {
  return `请根据以下 YouTube 视频字幕，生成一篇排版优美、可直接渲染的中文文章。

要求：
1. 直接输出 HTML 片段，不要输出 Markdown，不要输出解释，不要输出代码块。
2. 如果内容明显是采访、播客、AMA、圆桌或问答，请尽量保留对话感，优先使用 \`<p><strong>说话人：</strong>内容</p>\` 的形式来组织关键问答。
3. 保留原视频观点，不要胡编事实；允许适度润色，但不要改写原意。
4. 优先修复字幕里的碎片化断句、错误换行、被拆开的短语和句子，让中文读起来连贯自然。
5. 如果原字幕是英文，请直接翻成自然中文，不要有翻译腔。
6. 整体效果要更像一篇"整理好的对话长文"，而不是摘要或提纲；内容要充分展开，不要只写几个结论。
7. 标题克制、明确，有信息量；不要营销号标题。

HTML 结构要求：
- 只使用这些标签：<h1> <h2> <h3> <p> <blockquote> <strong> <br>
- 主标题使用 <h1>
- 一级分段标题使用 <h2>，格式尽量接近 \`1 技术革命：...\`
- 二级小节使用 <h3>，格式尽量接近 \`1.1 ...\`
- 正文使用 <p>
- 关键原话或高价值观点使用 <blockquote>
- 如果要写说话人，请放在同一个段落里，例如：\`<p><strong>主持人：</strong>问题内容</p>\`
- 不要输出其它标签

排版要求：
- 字幕里有多少个独立话题/问答，就写多少个 <h2> 章节，绝对不能跳过或合并不同话题
- 每个主持人问题都必须单独成节或单独成段，不能把两个不同问题压缩合并
- 对话感要强：每个问答都要完整展开，还原受访者的完整论述，不要只写结论句
- 话题切换即换节：只要主持人提出了新问题或对话转向了新方向，就必须开新的 <h2>，不能因为话题相关就合并
- 尽量先给 1 段导语，再进入章节正文
- 每个 <h2> 下至少有 2-3 段正文
- 章节风格尽量接近"整理稿/访谈纪要"，而不是百科式摘要
- 段落完整，避免"回溯""展望"这种单独悬空一行
- 不要把编号、标题、句子拆开
- 不要输出裸露的 HTML 实体编码
- 写完所有话题后再停止，不要在中途截断

字幕内容：
${captionsText}

现在开始直接输出 HTML：`;
}

export function normalizeGeneratedHtml(html) {
  return decodeHtmlEntities(html)
    // 块级结构里不需要 <br>，Gemini 误插的全部移除
    .replace(/<br\s*\/?>/g, '')
    // 去掉中文字符、标点、数字之间的多余空格（token 边界产生）
    .replace(/([\u4e00-\u9fff\d])\s+([\u4e00-\u9fff，。！？；：、""''）】》])/g, '$1$2')
    .replace(/([，。！？；：、""''（《])\s+/g, '$1')
    .replace(/\s+([，。！？；：、"'）》])/g, '$1')
    // 修复结构性碎片
    .replace(/<(h2|h3)>(\d+(?:\.\d+)?)([\u4e00-\u9fff])/g, '<$1>$2 $3')
    .replace(/<p>(回溯|展望|总结)<\/p>/g, '<p><strong>$1：</strong></p>')
    .replace(/<p><strong>([\w\u4e00-\u9fff·]+)<\/strong><\/p>\s*<p>/g, '<p><strong>$1：</strong>')
    .replace(/<h2>(\d+)\.<\/h2>\s*<p>([^<]{1,24})<\/p>/g, '<h2>$1. $2</h2>')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function decodeHtmlEntities(html) {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelayMs(detail, attempt) {
  const match = String(detail).match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (match) {
    return Math.ceil(Number(match[1]) * 1000);
  }

  return 1200 * attempt;
}

async function consumeGeminiBuffer(buffer, onChunk, flushAll) {
  let rest = buffer;

  while (true) {
    const newlineIndex = rest.indexOf('\n');
    if (newlineIndex === -1) {
      break;
    }

    const line = rest.slice(0, newlineIndex).trim();
    rest = rest.slice(newlineIndex + 1);
    await processGeminiLine(line, onChunk);
  }

  if (flushAll && rest.trim()) {
    await processGeminiLine(rest.trim(), onChunk);
    return '';
  }

  return rest;
}

async function processGeminiLine(line, onChunk) {
  if (!line.startsWith('data:')) {
    return;
  }

  const payload = line.slice(5).trim();
  if (!payload || payload === '[DONE]') {
    return;
  }

  try {
    const data = JSON.parse(payload);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text) {
      await onChunk(text);
    }
  } catch {
    // 忽略单个异常 chunk，不中断整体流式输出
  }
}

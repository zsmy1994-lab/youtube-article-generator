import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from 'youtube-transcript/dist/youtube-transcript.esm.js';

const VIDEO_ID_PATTERN = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
const PREFERRED_LANGUAGES = ['zh-CN', 'zh-Hans', 'zh', 'en'];
const BLOCK_MAX_CHARS = 220;
const CAPTION_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const captionCache = new Map();
const CAPTION_CACHE_PREFIX = 'caption:';

export function extractVideoId(input) {
  if (input.length === 11 && !input.includes('http')) {
    return input;
  }

  const directMatch = input.match(VIDEO_ID_PATTERN);
  if (directMatch?.[1]) {
    return directMatch[1];
  }

  const shortsMatch = input.match(/youtube\.com\/shorts\/([^&?/\s]{11})/i);
  return shortsMatch?.[1] ?? null;
}

export async function fetchYouTubeCaptions(videoId, env = {}) {
  const cachedCaptions = await getCachedCaptions(videoId, env);
  if (cachedCaptions) return cachedCaptions;

  const langs = [...PREFERRED_LANGUAGES, null]; // null = 让库自动选语言
  const errors = [];

  for (const lang of langs) {
    try {
      const transcript = await fetchTranscript(videoId, lang ? { lang } : {});
      if (!transcript.length) continue;

      const normalized = transcript.map(normalizeCaption);
      await setCachedCaptions(videoId, normalized, env);
      return normalized;
    } catch (error) {
      if (!(error instanceof YoutubeTranscriptNotAvailableLanguageError)) {
        errors.push(error);
      }
    }
  }

  throw mapTranscriptError(videoId, errors.at(-1));
}

export function formatCaptions(captions) {
  return mergeCaptionBlocks(captions)
    .map(item => `[${formatOffset(item.offset)}] ${item.text}`)
    .join('\n');
}

export function __clearCaptionCache() {
  captionCache.clear();
}

export function __seedCaptionCache(videoId, captions, ttlMs = CAPTION_CACHE_TTL_MS) {
  captionCache.set(videoId, { expiresAt: Date.now() + ttlMs, captions });
}

function getCaptionCacheKey(videoId) {
  return `${CAPTION_CACHE_PREFIX}${videoId}`;
}

function normalizeCaption(item) {
  return {
    ...item,
    duration: normalizeTimeValue(item.duration),
    offset: normalizeTimeValue(item.offset),
    text: normalizeCaptionText(item.text),
  };
}

async function getCachedCaptions(videoId, env) {
  if (env?.CACHE_KV) {
    try {
      const cached = await env.CACHE_KV.get(getCaptionCacheKey(videoId), 'json');
      if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch {
      // fall through to in-memory cache
    }
  }

  const entry = captionCache.get(videoId);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    captionCache.delete(videoId);
    return null;
  }

  return entry.captions;
}

async function setCachedCaptions(videoId, captions, env) {
  if (env?.CACHE_KV) {
    try {
      await env.CACHE_KV.put(getCaptionCacheKey(videoId), JSON.stringify(captions), {
        expirationTtl: Math.floor(CAPTION_CACHE_TTL_MS / 1000),
      });
    } catch {
      // fall through to in-memory cache
    }
  }

  captionCache.set(videoId, { expiresAt: Date.now() + CAPTION_CACHE_TTL_MS, captions });
}

function mergeCaptionBlocks(captions) {
  const cleaned = captions.filter(item => item.text);
  const blocks = [];

  for (const item of cleaned) {
    const current = blocks[blocks.length - 1];

    if (!current) {
      blocks.push({ ...item });
      continue;
    }

    const gap = item.offset - (current.offset + current.duration);
    const mergedText = joinCaptionText(current.text, item.text);
    const shouldStartNewBlock =
      mergedText.length > BLOCK_MAX_CHARS ||
      (gap > 3500 && looksCompleteSentence(current.text)) ||
      (looksCompleteSentence(current.text) && current.text.length > 80);

    if (shouldStartNewBlock) {
      blocks.push({ ...item });
      continue;
    }

    current.text = mergedText;
    current.duration = Math.max(item.offset + item.duration - current.offset, current.duration);
  }

  return blocks;
}

function normalizeCaptionText(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
    .replace(/([\u4e00-\u9fff])\s+([，。！？；：、“”‘’（）])/g, '$1$2')
    .replace(/([（“‘])\s+([\u4e00-\u9fffA-Za-z0-9])/g, '$1$2')
    .trim();
}

function joinCaptionText(left, right) {
  if (!left) return right;
  if (!right) return left;

  if (/[A-Za-z0-9]$/.test(left) && /^[A-Za-z0-9]/.test(right)) {
    return `${left} ${right}`;
  }

  if (/[-/()]$/.test(left) || /^[,.;:!?%)]/.test(right)) {
    return `${left}${right}`;
  }

  if (/[\u4e00-\u9fff”’）】》]$/.test(left) || /^[\u4e00-\u9fff，。！？；：、）】》]/.test(right)) {
    return `${left}${right}`;
  }

  return `${left} ${right}`;
}

function looksCompleteSentence(text) {
  return /[。！？.!?…]$/.test(text.trim());
}

function normalizeTimeValue(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (!Number.isInteger(value) || value < 100) {
    return Math.round(value * 1000);
  }

  return value;
}

function mapTranscriptError(videoId, error) {
  if (error instanceof YoutubeTranscriptTooManyRequestError) {
    return new Error('YouTube 当前要求验证码或限制过多请求，暂时无法抓取字幕');
  }

  if (error instanceof YoutubeTranscriptVideoUnavailableError) {
    return new Error(`视频不可用: ${videoId}`);
  }

  if (error instanceof YoutubeTranscriptDisabledError || error instanceof YoutubeTranscriptNotAvailableError) {
    return new Error('该视频没有公开字幕，当前版本仅支持可直接访问字幕的公开视频');
  }

  return new Error(error?.message || '字幕获取失败');
}

function formatOffset(offsetMs) {
  const totalSeconds = Math.floor(offsetMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
}

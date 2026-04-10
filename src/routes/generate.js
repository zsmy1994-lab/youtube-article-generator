import { generateArticleStream, normalizeGeneratedHtml, parseGeminiSseStream } from '../services/gemini.js';
import { createSseStreamResponse } from '../utils/sse.js';
import { extractVideoId, fetchYouTubeCaptions, formatCaptions } from '../services/youtube.js';

export async function handleGenerateRequest(request, env) {
  try {
    const { url } = await request.json();

    if (!url) return new Response('请提供 YouTube 视频链接', { status: 400 });
    if (!env.GEMINI_API_KEY) return new Response('服务端未配置 GEMINI_API_KEY', { status: 500 });

    const videoId = extractVideoId(url);
    if (!videoId) return new Response('无效的 YouTube 链接', { status: 400 });

    let captions;
    try {
      captions = await fetchYouTubeCaptions(videoId, env);
    } catch (error) {
      return new Response(`获取字幕失败: ${error.message}`, { status: 400 });
    }

    if (!captions.length) return new Response('该视频没有可用字幕', { status: 400 });

    const captionsText = formatCaptions(captions);

    return createSseStreamResponse(async send => {
      await send({ status: '正在生成文章…' });
      const geminiResponse = await generateArticleStream(captionsText, env.GEMINI_API_KEY);

      const chunks = [];
      await parseGeminiSseStream(geminiResponse, async chunk => {
        chunks.push(chunk);
        await send({ chunk });
      });

      if (!chunks.length) throw new Error('模型未返回可解析内容，请稍后重试。');

      await send({ finalHtml: normalizeGeneratedHtml(chunks.join('')) });
      await send('[DONE]');
    });
  } catch (error) {
    console.error('Generate route error:', error);
    return new Response(`服务器错误: ${error.message}`, { status: 500 });
  }
}

export function renderHomePage({ hasGeminiKey = false } = {}) {
  const defaultUrl = 'https://www.youtube.com/watch?v=xRh2sVcNXQ8';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>视频转文章</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: radial-gradient(circle at top, #182338 0%, #0f172a 55%);
      color: #e2e8f0;
      padding: 24px 16px 64px;
    }
    .shell { max-width: 860px; margin: 0 auto; }
    .hero { margin-bottom: 20px; padding-top: 24px; }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      font-size: 12px;
      letter-spacing: 0.04em;
      margin-bottom: 14px;
    }
    .hero h1 { font-size: 36px; line-height: 1.1; margin-bottom: 10px; letter-spacing: -0.02em; }
    .hero p { color: #94a3b8; font-size: 15px; }
    .panel {
      background: rgba(17, 24, 39, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.12);
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 20px 60px rgba(2, 8, 23, 0.3);
      backdrop-filter: blur(20px);
    }
    .row { display: flex; gap: 10px; align-items: stretch; }
    input {
      flex: 1;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(15, 23, 42, 0.8);
      color: #f8fafc;
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 14px;
      transition: border-color .2s, box-shadow .2s;
    }
    input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
    button {
      border: none;
      border-radius: 12px;
      padding: 0 22px;
      min-width: 96px;
      font-weight: 600;
      font-size: 14px;
      color: #fff;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status {
      display: none;
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 10px;
      background: rgba(30, 41, 59, 0.8);
      color: #cbd5e1;
      font-size: 13px;
    }
    .status.show { display: block; }
    .status.error { border: 1px solid rgba(248, 113, 113, 0.3); color: #fca5a5; }
    .status.success { border: 1px solid rgba(74, 222, 128, 0.3); color: #86efac; }
    .status.loading { border: 1px solid rgba(99, 102, 241, 0.3); color: #a5b4fc; }
    .progress { display: none; margin-top: 10px; height: 3px; background: rgba(148, 163, 184, 0.1); border-radius: 999px; overflow: hidden; }
    .progress.show { display: block; }
    .progress > span { display: block; height: 100%; width: 0%; background: linear-gradient(90deg, #6366f1, #22d3ee); transition: width .3s ease; }
    /* 文章区域 */
    .article-wrap { padding: 0; overflow: hidden; }
    .article {
      min-height: 200px;
      background: #fff;
      color: #1e293b;
      border-radius: 14px;
      padding: 48px 52px;
      font-size: 16px;
      line-height: 1.9;
      font-family: -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    }
    .article h1 {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.35;
      letter-spacing: -0.01em;
      color: #0f172a;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f1f5f9;
    }
    .article h2 {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin: 44px 0 14px;
      padding: 10px 16px;
      background: #f8fafc;
      border-left: 3px solid #6366f1;
      border-radius: 0 8px 8px 0;
    }
    .article h3 {
      font-size: 15px;
      font-weight: 600;
      color: #475569;
      margin: 24px 0 10px;
      padding-left: 10px;
      border-left: 2px solid #e2e8f0;
    }
    .article p {
      margin-bottom: 16px;
      color: #334155;
      font-size: 15.5px;
    }
    .article blockquote {
      margin: 24px 0;
      padding: 16px 20px;
      background: #f5f3ff;
      border-left: 3px solid #8b5cf6;
      border-radius: 0 10px 10px 0;
      color: #4c1d95;
      font-size: 15px;
      line-height: 1.75;
    }
    .article strong { color: #4f46e5; font-weight: 600; }
    .cursor { display: inline-block; width: 2px; height: 1.1em; background: #6366f1; animation: blink 1s step-end infinite; vertical-align: text-bottom; margin-left: 1px; }
    @keyframes blink { 50% { opacity: 0; } }
    @media (max-width: 720px) {
      .row { flex-direction: column; }
      button { min-height: 46px; }
      .hero h1 { font-size: 28px; }
      .article { padding: 28px 22px; }
      .article h1 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="eyebrow">Video → Article</div>
      <h1>视频转文章</h1>
      <p>输入一个带字幕的 YouTube 链接，自动生成中文文章。</p>
    </section>

    <section class="panel">
      <div class="row">
        <input id="videoUrl" type="text" value="${defaultUrl}" placeholder="粘贴 YouTube 视频链接" />
        <button id="generateBtn">生成</button>
      </div>
      <div id="status" class="status${hasGeminiKey ? '' : ' show error'}">${hasGeminiKey ? '' : '当前服务未配置 GEMINI_API_KEY，点击生成会失败。'}</div>
      <div id="progress" class="progress"><span id="progressFill"></span></div>
    </section>

    <section class="panel" style="padding: 0; overflow: hidden;">
      <article id="article" class="article">
        <p style="color:#94a3b8;">生成结果会显示在这里。</p>
      </article>
    </section>
  </div>

  <script>
    const videoUrlInput = document.getElementById('videoUrl');
    const generateBtn = document.getElementById('generateBtn');
    const statusEl = document.getElementById('status');
    const articleEl = document.getElementById('article');
    const progressEl = document.getElementById('progress');
    const progressFillEl = document.getElementById('progressFill');
    let generating = false;

    generateBtn.addEventListener('click', generateArticle);
    videoUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !generating) generateArticle(); });

    async function generateArticle() {
      const url = videoUrlInput.value.trim();
      if (!url) return showStatus('请输入 YouTube 视频链接。', 'error');

      generating = true;
      generateBtn.disabled = true;
      articleEl.innerHTML = '';
      showStatus('正在提取字幕并请求 Gemini…', 'loading');
      showProgress(12);

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) throw new Error(await response.text());

        let rawHtml = '';
        let finalizedHtml = '';
        let progress = 20;
        articleEl.innerHTML = '<span class="cursor"></span>';

        for await (const data of parseSseStream(response.body)) {
          if (data.error) throw new Error(data.error);
          if (data.status) {
            showStatus(data.status, 'loading');
            progress = Math.min(progress + 8, 88);
            showProgress(progress);
          } else if (data.chunk) {
            rawHtml += data.chunk;
            articleEl.innerHTML = rawHtml + '<span class="cursor"></span>';
          } else if (data.finalHtml) {
            finalizedHtml = data.finalHtml;
          }
        }

        if (finalizedHtml) {
          articleEl.innerHTML = finalizedHtml;
          showProgress(100);
          showStatus('文章生成完成。', 'success');
        } else {
          articleEl.innerHTML = '<p>生成失败，请重试。</p>';
          showStatus('生成失败，未拿到完整结果。', 'error');
        }
      } catch (error) {
        articleEl.innerHTML = '<p>生成失败，请换一个带公开字幕的视频再试。</p>';
        showStatus(error.message, 'error');
      } finally {
        generating = false;
        generateBtn.disabled = false;
      }
    }

    async function* parseSseStream(body) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop(); // 保留未完成的行

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            yield JSON.parse(payload);
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    function showStatus(message, type) {
      statusEl.className = 'status show ' + type;
      statusEl.textContent = message;
    }

    function showProgress(value) {
      progressEl.classList.add('show');
      progressFillEl.style.width = value + '%';
    }

  </script>
</body>
</html>`;
}

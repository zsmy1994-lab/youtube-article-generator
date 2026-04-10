import { handleGenerateRequest } from '../routes/generate.js';
import { renderHomePage } from '../ui/home-page.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '') {
      return new Response(renderHomePage({ hasGeminiKey: Boolean(env.GEMINI_API_KEY) }), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    if (url.pathname === '/api/generate' && request.method === 'POST') {
      return handleGenerateRequest(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

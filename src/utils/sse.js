export function createSseStreamResponse(handler) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = async payload => {
    if (payload === '[DONE]') {
      await writer.write(encoder.encode('data: [DONE]\n\n'));
      return;
    }

    await writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
  };

  (async () => {
    try {
      await handler(send);
    } catch (error) {
      await send({ error: error.message || '未知错误' });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

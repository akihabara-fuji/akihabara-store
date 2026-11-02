function createAiClient({ baseUrl = process.env.AI_BASE_URL, apiKey = process.env.AI_API_KEY, model = process.env.AI_MODEL, timeoutMs = 30000, transport } = {}) {
  async function request(payload) {
    if (!transport && (!baseUrl || !apiKey || !model)) throw new Error('AI provider is not configured');
    const fn = transport || (async ({ signal, body }) => {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST', signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, temperature: 0.4, ...body })
      });
      return { status: response.status, text: await response.text() };
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`AI provider timeout after ${timeoutMs}ms`)), timeoutMs));
      const result = await Promise.race([fn({ signal: controller.signal, body: payload }), timeout]);
      if (result.status < 200 || result.status >= 300) throw new Error(`AI provider returned HTTP ${result.status}`);
      return result.text;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error(`AI provider timeout after ${timeoutMs}ms`);
      throw error;
    } finally { clearTimeout(timer); }
  }
  return {
    async completeJson({ prompt }) {
      const text = await request({ messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } });
      try { return JSON.parse(text); } catch { throw new Error('AI provider returned invalid JSON'); }
    }
  };
}
module.exports = { createAiClient };

type ContentPart = { text?: unknown };

export function readModelText(content: unknown) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return null;
  const text = content
    .map((part: ContentPart) => typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim();
  return text || null;
}

export function parseModelJson(content: unknown): unknown {
  const text = readModelText(content);
  if (!text) throw new Error('智能服务没有返回可用内容。');
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstBrace = unfenced.indexOf('{');
  const lastBrace = unfenced.lastIndexOf('}');
  const json = firstBrace >= 0 && lastBrace > firstBrace ? unfenced.slice(firstBrace, lastBrace + 1) : unfenced;
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error('智能服务返回的内容不完整，请再试一次。');
  }
}

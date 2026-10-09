export type EndpointCheck = { valid: true; value: string } | { valid: false; reason: string };

function isPrivateIpv4(host: string) {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = parts;
  if (first === undefined || second === undefined) return false;
  return first === 0
    || first === 10
    || first === 127
    || first === 169 && second === 254
    || first === 192 && second === 168
    || first === 172 && second >= 16 && second <= 31;
}

export function validateAiEndpoint(input: string): EndpointCheck {
  const value = input.trim();
  if (!value) return { valid: false, reason: '先填 API 地址。' };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { valid: false, reason: '地址格式不对。' };
  }

  if (url.protocol !== 'https:') return { valid: false, reason: '只允许 HTTPS 地址。' };
  if (url.username || url.password || url.search || url.hash) return { valid: false, reason: '地址里不要带账号、参数或锚点。' };

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.local') || host.includes(':') || isPrivateIpv4(host)) {
    return { valid: false, reason: '不能使用本机、局域网或私有地址。' };
  }

  return { valid: true, value: `${url.origin}${url.pathname}` };
}

export function resolveAiChatEndpoint(input: string): EndpointCheck {
  const endpoint = validateAiEndpoint(input);
  if (!endpoint.valid) return endpoint;
  const base = endpoint.value.replace(/\/$/, '');
  return {
    valid: true,
    value: base.endsWith('/chat/completions') ? base : `${base}/chat/completions`,
  };
}

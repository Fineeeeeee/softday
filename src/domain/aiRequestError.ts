export function isCanceledRequestError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return error.name === 'AbortError' || message.includes('request has been canceled') || message.includes('request has been cancelled');
}

export function isNetworkRequestError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return error instanceof TypeError && (message.includes('fetch failed') || message.includes('network request failed'));
}

export function validatePublicDomainInput(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return "Enter a valid public domain, such as example.com";
  }

  if (!['https:', 'http:'].includes(url.protocol) || url.port || url.username || url.password) {
    return "Use only a public domain without a port or credentials";
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    return "Enter only a domain, not a page path, search query, or fragment";
  }

  const hostname = url.hostname.replace(/\.$/, '');
  const labels = hostname.split('.');
  const hasValidLabels = labels.length >= 2 && labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$|^[a-z0-9]$/i.test(label));
  const isIpAddress = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');
  if (!hasValidLabels || hostname.length > 253 || isIpAddress) {
    return "Enter a valid public domain name rather than an IP address or local host";
  }
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return "Local and private network targets are not permitted";
  }
  return null;
}

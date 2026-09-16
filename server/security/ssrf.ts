import dns from 'dns';
import net from 'net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
  'metadata',
  'instance-data',
]);

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link-local / AWS / GCP metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (Private network)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private network)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224 && parts[0] <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (parts[0] >= 240) return true;
    // 255.255.255.255 (Broadcast)
    if (ip === '255.255.255.255') return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // ::1 loopback
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // :: unspecified
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
    // Unique local address fc00::/7
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // Link-local address fe80::/10
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
    return false;
  }

  return true; // If not valid IPv4/IPv6, block
}

export function normalizeTargetUrl(rawUrl: string): { valid: boolean; url?: URL; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  let cleaned = rawUrl.trim();
  if (!cleaned) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Prepend https:// if no scheme provided
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only http and https protocols are supported' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || hostname.length < 3 || !hostname.includes('.')) {
      return { valid: false, error: 'Invalid domain name or TLD missing' };
    }

    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return { valid: false, error: 'Target domain is restricted for security reasons (internal or localhost address)' };
    }

    return { valid: true, url: parsed };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export async function validateIpSafety(hostname: string): Promise<{ safe: boolean; error?: string }> {
  try {
    const lookup = await dns.promises.lookup(hostname, { all: true });
    if (!lookup || lookup.length === 0) {
      return { safe: false, error: `Domain "${hostname}" could not be resolved (DNS lookup failed)` };
    }

    for (const record of lookup) {
      if (isPrivateIp(record.address)) {
        return { safe: false, error: `Domain resolves to a prohibited internal IP address (${record.address})` };
      }
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, error: `DNS lookup failed for "${hostname}": ${err?.message || 'unknown error'}` };
  }
}

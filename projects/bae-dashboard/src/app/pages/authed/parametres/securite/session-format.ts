/**
 * Pure formatting helpers for the "sessions actives" panel.
 *
 * Kept free of Angular and of the network layer so they can be unit-tested
 * directly: the API hands back a raw `userAgent` string and a raw `ipAddress`,
 * and both are attacker-influenced values that must never crash rendering.
 */

/** Shown when a user agent carries nothing we can honestly name. */
export const UNKNOWN_DEVICE = 'Appareil inconnu';

/** Shown when there is no usable IP address. */
export const UNKNOWN_IP = 'IP inconnue';

/** Shown for loopback addresses (`::1`, `127.0.0.1`) — typical in local dev. */
export const LOCAL_IP = 'Adresse locale';

interface Rule {
  readonly test: RegExp;
  readonly label: string;
}

/**
 * Platform rules, most specific first: an iPhone UA contains "like Mac OS X",
 * and an Android UA contains "Linux", so the narrow matches must win.
 */
const PLATFORM_RULES: readonly Rule[] = [
  { test: /\biPhone\b/, label: 'iPhone' },
  { test: /\biPad\b/, label: 'iPad' },
  { test: /\biPod\b/, label: 'iPod' },
  { test: /\bAndroid\b/, label: 'Android' },
  { test: /\bCrOS\b/, label: 'ChromeOS' },
  { test: /\b(?:Macintosh|Mac OS X)\b/, label: 'Mac' },
  { test: /\bWindows\b/, label: 'Windows' },
  { test: /\bLinux\b/, label: 'Linux' },
];

/**
 * Browser rules, most specific first. Chromium forks all advertise
 * `Chrome/…`, and every WebKit browser advertises `Safari/…`, so Edge/Opera
 * must be tested before Chrome and Chrome before Safari.
 */
const BROWSER_RULES: readonly Rule[] = [
  { test: /\bEdgA?\/(\d+)/, label: 'Edge' },
  { test: /\bOPR\/(\d+)/, label: 'Opera' },
  { test: /\b(?:Firefox|FxiOS)\/(\d+)/, label: 'Firefox' },
  { test: /\b(?:Chrome|CriOS)\/(\d+)/, label: 'Chrome' },
  { test: /\bVersion\/(\d+)[\d.]*\s+(?:Mobile\/\S+\s+)?Safari\b/, label: 'Safari' },
];

/** Non-browser API clients. These carry no platform, so the label stands alone. */
const CLIENT_RULES: readonly Rule[] = [
  { test: /^curl\/(\d+)/i, label: 'curl' },
  { test: /^PostmanRuntime\/(\d+)/i, label: 'Postman' },
  { test: /\binsomnia\/(\d+)/i, label: 'Insomnia' },
  { test: /\baxios\/(\d+)/i, label: 'axios' },
  { test: /\bokhttp\/(\d+)/i, label: 'OkHttp' },
  { test: /\bnode(?:\.js)?\/v?(\d+)/i, label: 'Node' },
];

function matchRule(ua: string, rules: readonly Rule[]): string | null {
  for (const rule of rules) {
    const match = rule.test.exec(ua);
    if (match) {
      return match[1] ? `${rule.label} ${match[1]}` : rule.label;
    }
  }
  return null;
}

/**
 * Turns a raw `User-Agent` header into a short device label such as
 * `Mac · Chrome 121` or `iPhone · Safari 17`.
 *
 * Deliberately conservative: anything it cannot name confidently comes back as
 * {@link UNKNOWN_DEVICE} rather than a guess. A partial match degrades to
 * whichever half is known (`Mac`, or `Chrome 121`) instead of inventing the
 * other.
 */
export function parseUserAgent(userAgent: string | null | undefined): string {
  if (typeof userAgent !== 'string') return UNKNOWN_DEVICE;

  const ua = userAgent.trim();
  if (ua.length === 0) return UNKNOWN_DEVICE;

  const platform = matchRule(ua, PLATFORM_RULES);
  const browser = matchRule(ua, BROWSER_RULES);

  if (platform && browser) return `${platform} · ${browser}`;
  if (platform) return platform;
  if (browser) return browser;

  // No browser signature — it may still be a recognisable API client.
  const client = matchRule(ua, CLIENT_RULES);
  if (client) return client;

  return UNKNOWN_DEVICE;
}

/** `1.2.3.4` → `1.2.x.x`, matching the masking convention already in the UI. */
function maskIpv4(ip: string): string | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!match) return null;
  const octets = [match[1], match[2], match[3], match[4]].map(Number);
  if (octets.some((octet) => octet > 255)) return null;
  return `${octets[0]}.${octets[1]}.x.x`;
}

/**
 * Masks an IP address for display, keeping only enough to recognise a network.
 *
 * Handles the values the API really produces: a normal IPv4, an IPv6 address,
 * the IPv6 loopback `::1` seen in local development, IPv4-mapped IPv6
 * (`::ffff:1.2.3.4`), and `null` when the token was issued without one.
 */
export function maskIpAddress(ipAddress: string | null | undefined): string {
  if (typeof ipAddress !== 'string') return UNKNOWN_IP;

  const ip = ipAddress.trim();
  if (ip.length === 0) return UNKNOWN_IP;

  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return LOCAL_IP;

  const v4 = maskIpv4(ip);
  if (v4) return v4;

  if (ip.includes(':')) {
    // IPv4-mapped IPv6 (`::ffff:192.168.1.1`) — mask the embedded IPv4 instead.
    const embedded = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
    if (embedded) {
      const masked = maskIpv4(embedded[1]);
      if (masked) return masked;
    }

    const groups = ip.split(':').filter((group) => group.length > 0);
    if (groups.length === 0) return UNKNOWN_IP;
    return `${groups.slice(0, 2).join(':')}:x:x`;
  }

  return UNKNOWN_IP;
}

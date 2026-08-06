import {
  LOCAL_IP,
  UNKNOWN_DEVICE,
  UNKNOWN_IP,
  maskIpAddress,
  parseUserAgent,
} from './session-format';

describe('parseUserAgent', () => {
  it('returns the generic fallback for a missing user agent', () => {
    expect(parseUserAgent(null)).toBe(UNKNOWN_DEVICE);
    expect(parseUserAgent(undefined)).toBe(UNKNOWN_DEVICE);
    expect(parseUserAgent('')).toBe(UNKNOWN_DEVICE);
    expect(parseUserAgent('   ')).toBe(UNKNOWN_DEVICE);
  });

  it('returns the generic fallback rather than guessing an unrecognised agent', () => {
    expect(parseUserAgent('totally-made-up-agent')).toBe(UNKNOWN_DEVICE);
    expect(parseUserAgent('-')).toBe(UNKNOWN_DEVICE);
  });

  it('parses a desktop Chrome on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
    expect(parseUserAgent(ua)).toBe('Mac · Chrome 121');
  });

  it('parses mobile Safari on iPhone without mistaking it for a Mac', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(ua)).toBe('iPhone · Safari 17');
  });

  it('parses desktop Safari on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
    expect(parseUserAgent(ua)).toBe('Mac · Safari 17');
  });

  it('prefers Edge over the Chrome signature it also advertises', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91';
    expect(parseUserAgent(ua)).toBe('Windows · Edge 120');
  });

  it('prefers Opera over the Chrome signature it also advertises', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 OPR/104.0.0.0';
    expect(parseUserAgent(ua)).toBe('Windows · Opera 104');
  });

  it('parses Firefox on Linux', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0';
    expect(parseUserAgent(ua)).toBe('Linux · Firefox 122');
  });

  it('parses Chrome on Android without falling back to Linux', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    expect(parseUserAgent(ua)).toBe('Android · Chrome 120');
  });

  it('names known API clients that carry no platform', () => {
    expect(parseUserAgent('curl/8.4.0')).toBe('curl 8');
    expect(parseUserAgent('PostmanRuntime/7.36.1')).toBe('Postman 7');
  });

  it('degrades to the half it recognises instead of inventing the other', () => {
    expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('Mac');
    expect(parseUserAgent('Chrome/121.0.0.0')).toBe('Chrome 121');
  });
});

describe('maskIpAddress', () => {
  it('returns the fallback when there is no address', () => {
    expect(maskIpAddress(null)).toBe(UNKNOWN_IP);
    expect(maskIpAddress(undefined)).toBe(UNKNOWN_IP);
    expect(maskIpAddress('')).toBe(UNKNOWN_IP);
  });

  it('labels loopback addresses as local', () => {
    expect(maskIpAddress('::1')).toBe(LOCAL_IP);
    expect(maskIpAddress('127.0.0.1')).toBe(LOCAL_IP);
  });

  it('keeps only the first two octets of an IPv4 address', () => {
    expect(maskIpAddress('92.184.12.3')).toBe('92.184.x.x');
    expect(maskIpAddress('192.168.65.1')).toBe('192.168.x.x');
    expect(maskIpAddress('10.0.4.17')).toBe('10.0.x.x');
  });

  it('keeps only the first two groups of an IPv6 address', () => {
    expect(maskIpAddress('2a01:cb04:1234:5678:9abc:def0:1234:5678')).toBe('2a01:cb04:x:x');
    expect(maskIpAddress('fe80::1ff:fe23:4567:890a')).toBe('fe80:1ff:x:x');
  });

  it('masks the embedded IPv4 of an IPv4-mapped IPv6 address', () => {
    expect(maskIpAddress('::ffff:92.184.12.3')).toBe('92.184.x.x');
  });

  it('rejects malformed addresses rather than echoing them back', () => {
    expect(maskIpAddress('not-an-ip')).toBe(UNKNOWN_IP);
    expect(maskIpAddress('999.1.1.1')).toBe(UNKNOWN_IP);
  });
});

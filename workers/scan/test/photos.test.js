import { describe, it, expect } from 'vitest';
import { extractPhotoUrls, looksLikeChallenge, extractListingAgent } from '../lib/photos.js';

const PAGE = `<html><head>
<meta property="og:image" content="https://ssl.cdn-redfin.com/photo/48/bigphoto/123/ABC123_0.jpg"/>
</head><body>
"photos":["https://ssl.cdn-redfin.com/photo/48/bigphoto/123/ABC123_1_0.jpg","https://ssl.cdn-redfin.com/photo/48/bigphoto/123/ABC123_2_0.jpg"]
${'x'.repeat(3000)}
</body></html>`;

describe('extractPhotoUrls', () => {
  it('pulls og:image first, then CDN photos, deduped, capped', () => {
    const urls = extractPhotoUrls(PAGE, 4);
    expect(urls[0]).toBe('https://ssl.cdn-redfin.com/photo/48/bigphoto/123/ABC123_0.jpg');
    expect(urls).toHaveLength(3);
    expect(new Set(urls).size).toBe(3);
  });
  it('handles reversed attribute order', () => {
    const html = `<meta content="https://ssl.cdn-redfin.com/photo/x.jpg" property="og:image">${'x'.repeat(3000)}`;
    expect(extractPhotoUrls(html)[0]).toBe('https://ssl.cdn-redfin.com/photo/x.jpg');
  });
  it('returns empty for photo-less pages', () => {
    expect(extractPhotoUrls('<html>' + 'x'.repeat(3000) + '</html>')).toEqual([]);
  });
});

describe('looksLikeChallenge', () => {
  it('flags captcha markers and tiny pages', () => {
    expect(looksLikeChallenge('<html>px-captcha</html>')).toBe(true);
    expect(looksLikeChallenge('<html>tiny</html>')).toBe(true);
    expect(looksLikeChallenge(PAGE)).toBe(false);
  });
});

describe('extractListingAgent', () => {
  const JSON_PAGE = `<html>${'x'.repeat(2500)}
    "agentName":"Jane Smith","brokerName":"Desert Realty Group",
    "agentPhoneNumber":{"phoneNumber":"602-555-0123","extension":""}
  </html>`;
  it('extracts name/brokerage/phone from embedded JSON', () => {
    const a = extractListingAgent(JSON_PAGE);
    expect(a).toEqual({ name: 'Jane Smith', brokerage: 'Desert Realty Group', phone: '602-555-0123' });
  });
  it('falls back to visible "Listed by" text', () => {
    const a = extractListingAgent(`<div>Listed by Bob Jones • Phoenix Homes LLC</div>${'x'.repeat(2500)}`);
    expect(a.name).toBe('Bob Jones');
    expect(a.brokerage).toBe('Phoenix Homes LLC');
    expect(a.phone).toBeNull();
  });
  it('returns null when nothing agent-like exists', () => {
    expect(extractListingAgent('<html>' + 'x'.repeat(2500) + '</html>')).toBeNull();
  });
});

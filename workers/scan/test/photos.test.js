import { describe, it, expect } from 'vitest';
import { extractPhotoUrls, looksLikeChallenge } from '../lib/photos.js';

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

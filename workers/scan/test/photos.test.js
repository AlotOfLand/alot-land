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

describe('extractListingAgent — fixtures from a real 2026-07 page', () => {
  const ESCAPED = String.raw`,"logoImageFileName\":\"armls.png\",\"listingBrokerNumber\":\"602-230-7600\",\"listingAgentName\":\"Omar Saint Louis\",\"listingAgentNumber\":\"480-406-1727\"},` +
    String.raw`\"listingBrokerName\":\"HomeSmart\",` +
    String.raw`\"listingAgent\":{\"name\":\"Scott Dempsey\",\"redfinAgentId\":4137}` + 'x'.repeat(2500);

  it('reads escaped-JSON page state: name, direct phone, brokerage', () => {
    expect(extractListingAgent(ESCAPED)).toEqual({
      name: 'Omar Saint Louis',
      brokerage: 'HomeSmart',
      phone: '480-406-1727',
    });
  });

  it('never captures carousel agents (listingAgent:{name:...})', () => {
    const carouselOnly = String.raw`\"listingAgent\":{\"name\":\"Scott Dempsey\"}` + 'x'.repeat(2500);
    const a = extractListingAgent(carouselOnly);
    expect(a?.name).not.toBe('Scott Dempsey');
  });

  it('falls back to the visible "Listed by <span>" DOM', () => {
    const dom = `<span class="agent-basic-details--heading">Listed by <span>Omar Saint Louis</span> </span><span class="agent-basic-details--broker"><span> <span class="font-dot">•</span> <!-- -->HomeSmart<!-- --> </span></span>` + 'x'.repeat(2500);
    const a = extractListingAgent(dom);
    expect(a.name).toBe('Omar Saint Louis');
    expect(a.brokerage).toBe('HomeSmart');
  });

  it('still reads unescaped JSON keys', () => {
    const plain = `"agentName":"Jane Smith","brokerName":"Desert Realty Group"` + 'x'.repeat(2500);
    const a = extractListingAgent(plain);
    expect(a.name).toBe('Jane Smith');
    expect(a.brokerage).toBe('Desert Realty Group');
  });

  it('falls back to the broker office number when no agent line exists', () => {
    const officeOnly = String.raw`\"listingBrokerNumber\":\"602-230-7600\",\"listingAgentName\":\"A B\"` + 'x'.repeat(2500);
    expect(extractListingAgent(officeOnly).phone).toBe('602-230-7600');
  });

  it('returns null when nothing agent-like exists', () => {
    expect(extractListingAgent('<html>' + 'x'.repeat(2500) + '</html>')).toBeNull();
  });
});

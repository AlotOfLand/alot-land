/**
 * Listing-photo extraction. The gis-csv feed has no photo URLs, so photos come
 * from ONE polite fetch of each listing's HTML page (same politeFetch throttle,
 * new listings only — never re-fetched once stored).
 *
 * This is the heavier access pattern the comps repo deliberately never built,
 * so it ships with a circuit breaker: N consecutive pages with no extractable
 * photo = assume we're being challenged and STOP (no retries, no evasion).
 */

/** Extract photo URLs from a Redfin listing page's HTML. */
export function extractPhotoUrls(html, max = 4) {
  if (!html) return [];
  const urls = [];

  // Primary: og:image meta tag (either attribute order).
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) urls.push(og[1]);

  // Secondary: CDN photo URLs embedded in the page state.
  const cdn = html.match(/https:\/\/ssl\.cdn-redfin\.com\/photo\/[^"'\\\s]+\.(?:jpg|jpeg|webp)/gi) || [];
  for (const u of cdn) {
    if (!urls.includes(u)) urls.push(u);
    if (urls.length >= max) break;
  }
  return urls.slice(0, max);
}

/** Does this HTML look like a bot challenge rather than a listing page? */
export function looksLikeChallenge(html) {
  if (!html || html.length < 2000) return true;
  return /captcha|are you a human|access to this page has been denied|px-captcha/i.test(html);
}

/**
 * Extract the listing agent from a Redfin listing page. The CSV never has
 * this, but the page HTML usually does — embedded JSON state first (most
 * reliable), visible "Listed by" text as fallback. Best-effort: any field may
 * come back null. These are LISTING agents on active deals — per spec they're
 * stored dnc_exempt (they want the call).
 */
export function extractListingAgent(html) {
  if (!html) return null;
  const out = { name: null, brokerage: null, phone: null };

  const jstr = (key) => {
    const m = html.match(new RegExp(`"${key}"\\s*:\\s*"([^"]{2,80})"`));
    return m ? m[1].replace(/\\u0026/g, '&').trim() : null;
  };
  out.name = jstr('agentName');
  out.brokerage = jstr('brokerName') || jstr('brokerageName');
  // Phone may appear flat or nested: "agentPhoneNumber":{"phoneNumber":"602-555-0123"}
  const phoneNested = html.match(/"agentPhoneNumber"\s*:\s*\{[^}]*"phoneNumber"\s*:\s*"([^"]{7,20})"/);
  out.phone = phoneNested ? phoneNested[1].trim() : jstr('agentPhoneNumber');

  if (!out.name) {
    // Visible-text fallback: "Listed by Jane Smith • Great Brokerage LLC"
    const vis = html.match(/Listed by\s+([A-Z][^•<|]{1,60}?)\s*[•|]\s*([^<]{2,60})/);
    if (vis) {
      out.name = vis[1].trim();
      out.brokerage = out.brokerage || vis[2].trim();
    }
  }
  return out.name || out.brokerage || out.phone ? out : null;
}

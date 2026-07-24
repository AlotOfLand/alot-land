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
 * Extract the listing agent from a Redfin listing page.
 *
 * Verified against a real page (2026-07): the data lives in ESCAPED JSON
 * embedded in the page state — \"listingAgentName\":\"Omar Saint Louis\",
 * \"listingAgentNumber\":\"480-406-1727\" (agent direct line),
 * \"listingBrokerName\":\"HomeSmart\", \"listingBrokerNumber\":\"602-230-7600\".
 * Quotes may or may not be backslash-escaped depending on nesting depth, so
 * every pattern tolerates both. The visible DOM fallback is
 * "Listed by <span>Name</span>".
 *
 * IMPORTANT: pages also embed OTHER listings' agents (nearby-homes carousel,
 * key shape listingAgent:{name:...}) — we deliberately read only the
 * subject-listing keys above to avoid capturing a neighbor's agent.
 */
export function extractListingAgent(html) {
  if (!html) return null;

  // Match "key":"value" whether quotes are raw or backslash-escaped.
  const esKey = (key) => {
    const m = html.match(new RegExp(`\\\\?"${key}\\\\?"\\s*:\\s*\\\\?"([^"\\\\]{1,100})`));
    return m ? m[1].replace(/\\u0026/g, '&').trim() : null;
  };

  const out = {
    name: esKey('listingAgentName') || esKey('agentName'),
    brokerage: esKey('listingBrokerName') || esKey('brokerName') || esKey('brokerageName'),
    // Prefer the agent's direct line; office number as fallback.
    phone: esKey('listingAgentNumber') || esKey('listingBrokerNumber'),
  };

  if (!out.name) {
    // Visible DOM fallback: Listed by <span>Jane Smith</span>
    const span = html.match(/Listed by\s*<span>([^<]{2,60})<\/span>/);
    if (span) out.name = span[1].trim();
    else {
      const plain = html.match(/Listed by\s+([A-Z][^•<|]{1,60}?)\s*[•|]\s*([^<]{2,60})/);
      if (plain) {
        out.name = plain[1].trim();
        out.brokerage = out.brokerage || plain[2].trim();
      }
    }
  }
  if (!out.brokerage) {
    // agent-basic-details--broker span: "• <!-- -->HomeSmart<!-- -->"
    const b = html.match(/agent-basic-details--broker[\s\S]{0,120}?•<\/span>\s*(?:<!--[\s\S]*?-->)?\s*([^<]{2,60}?)\s*(?:<!--)/);
    if (b) out.brokerage = b[1].trim();
  }

  // Sanity: drop junk phone-shaped values.
  if (out.phone && !/[\d]{3}.*[\d]{4}/.test(out.phone)) out.phone = null;

  return out.name || out.brokerage || out.phone ? out : null;
}

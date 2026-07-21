// Pulls the latest uploads from David's YouTube channel at build time.
// No API key needed — YouTube publishes a public RSS feed per channel (latest ~15).
// Videos are auto-categorised by title keyword, so no playlists are required.

export const CHANNEL_ID = 'UCuVnF2Prq1w5FF5ypLuTFnQ';
export const CHANNEL_URL = 'https://www.youtube.com/@DavidTheLandGuy';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

/** Pull a YouTube video id out of any common URL shape (watch, youtu.be, shorts, embed). */
export function ytIdFromUrl(url) {
  if (!url) return '';
  const m = String(url).match(
    /(?:youtu\.be\/|watch\?v=|\/shorts\/|\/embed\/|\/v\/)([A-Za-z0-9_-]{6,})/
  );
  return m ? m[1] : '';
}

export function thumbFor(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** True when a video is about Sugar Tree Vista (matched on the title). */
export function isSugarTree(title) {
  return /sugar\s*tree/i.test(title || '');
}

/**
 * Latest uploads, newest first. Returns [] if the feed can't be reached so a
 * network blip never fails the build.
 */
export async function getChannelVideos() {
  let xml = '';
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  }

  return xml
    .split('<entry>')
    .slice(1)
    .map((entry) => {
      const id = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
      if (!id) return null;
      const rawTitle =
        (entry.match(/<media:title>([\s\S]*?)<\/media:title>/) || [])[1] ||
        (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ||
        '';
      const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
      const title = decodeEntities(rawTitle);
      return { id, title, published, thumb: thumbFor(id), sugarTree: isSugarTree(title) };
    })
    .filter(Boolean);
}

import { lazy } from 'react';

/**
 * React.lazy that survives deploys. Every deploy renames hashed chunks, so a
 * tab opened before a deploy 404s when it lazy-loads a chunk afterwards
 * ("Loading map…" forever). On a failed dynamic import we reload the page
 * once (guarded so a genuinely broken build can't reload-loop).
 */
export function lazyReload(importer) {
  return lazy(() =>
    importer().catch((err) => {
      const KEY = 'mfda.chunk-reload-at';
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last > 15_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
        return new Promise(() => {}); // halt rendering while the reload happens
      }
      throw err;
    }),
  );
}

import { useEffect, useRef, useState } from 'react';
import { Map as MlMap, Marker, LngLatBounds, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { usd } from '../lib/format';

// Free raster tiles (OSM) per the no-Google-billing rule. Attribution required.
const STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const PIN_COLORS = { active: '#2E8C43', pending: '#B8860B', comingsoon: '#3E6DA3' };

/**
 * Map of on-market leads. Click a pin → floating card with photo + details +
 * Analyze. Same rows as the list view (filters already applied upstream).
 */
export default function ListingsMap({ rows, onAnalyze }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [selected, setSelected] = useState(null);
  const [mapError, setMapError] = useState(null);

  // Init once. Failures here (usually WebGL unavailable) must be VISIBLE —
  // a silent white box is undebuggable from a screenshot.
  useEffect(() => {
    let map;
    try {
      map = new MlMap({
        container: containerRef.current,
        style: STYLE,
        center: [-112.07, 33.45],
        zoom: 10,
        attributionControl: { compact: true },
      });
    } catch (e) {
      setMapError(String(e?.message || e));
      return undefined;
    }
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('error', (e) => {
      // Tile fetch errors are normal noise (adblockers etc.); only surface
      // errors that prevent the map itself from working.
      const msg = String(e?.error?.message || '');
      if (/webgl|context/i.test(msg)) setMapError(msg);
    });
    // Belt & suspenders: if the container was mid-layout at init, a resize
    // after first paint fixes a 0-height canvas.
    requestAnimationFrame(() => map && map.resize());
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers with rows.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const pts = rows.filter((d) => d.lat != null && d.lng != null);
    if (!pts.length) return;

    const bounds = new LngLatBounds();
    for (const d of pts) {
      const el = document.createElement('button');
      el.type = 'button';
      el.title = `${d.address} · ${usd(Number(d.price))}`;
      el.style.cssText = `width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${PIN_COLORS[d.listing_status] || '#8A8272'};border:2px solid #fff;
        box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer;padding:0;`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelected(d);
      });
      const marker = new Marker({ element: el, anchor: 'bottom' })
        .setLngLat([d.lng, d.lat])
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([d.lng, d.lat]);
    }
    map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
  }, [rows]);

  // Clear selection when it drops out of the filtered rows.
  useEffect(() => {
    if (selected && !rows.some((r) => r.id === selected.id)) setSelected(null);
  }, [rows, selected]);

  if (mapError) {
    return (
      <div className="card p-10 text-center" style={{ minHeight: '30vh' }}>
        <p className="font-medium text-danger">Map couldn’t start</p>
        <p className="text-sm text-muted mt-2 max-w-md mx-auto">
          {/webgl|context/i.test(mapError)
            ? 'Your browser blocked WebGL, which the map needs. Check Safari → Settings → Advanced (or your browser’s hardware-acceleration setting), or try Chrome.'
            : mapError}
        </p>
        <p className="text-xs text-muted mt-2">The list view has everything the map does.</p>
      </div>
    );
  }

  return (
    <div className="relative card overflow-hidden" style={{ height: '70vh' }}>
      <div ref={containerRef} className="absolute inset-0" />

      {selected && (
        <div className="absolute left-3 bottom-3 z-10 w-72 card shadow-xl overflow-hidden">
          {selected.photo_url ? (
            <img src={selected.photo_url} alt="" className="w-full h-36 object-cover" />
          ) : (
            <div className="w-full h-20 bg-surface-2 flex items-center justify-center text-muted text-xs">
              no photo yet
            </div>
          )}
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium leading-tight">{selected.address}</div>
                <div className="text-xs text-muted">
                  {[selected.city, selected.state].filter(Boolean).join(', ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-muted hover:text-ink text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="font-semibold tabular-nums">{usd(Number(selected.price))}</span>
              <span className="pill bg-surface-2 text-ink-2">{selected.unit_bucket}u</span>
              {selected.year_built && <span className="text-xs text-muted">{selected.year_built}</span>}
              {selected.beds_total != null && (
                <span className="text-xs text-muted">{selected.beds_total} bd total</span>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => onAnalyze(selected)} className="btn-gold text-sm py-1 flex-1">
                Analyze
              </button>
              {selected.listing_url && (
                <a
                  href={selected.listing_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost text-sm py-1"
                >
                  Redfin ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

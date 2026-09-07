import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

/**
 * Owner A — map/polygon-draw (Leaflet + Turf.js).
 *
 * Implements CLAUDE.md's spec:
 *  1. Render a Leaflet map, let the user draw/confirm a roof polygon.
 *  2. Hand the raw [lat, lng][] coordinates up (via onPolygonChange) so
 *     QuestionFlow can assemble the full SystemEconomicsInput — no geodesic
 *     math or bin-packing here, that's engine-system-economics' job (see
 *     ARCHITECTURE.md).
 *
 * Deliberately built on plain Leaflet rather than a react-leaflet /
 * leaflet-draw dependency: neither is in package.json yet, and adding a new
 * dependency here isn't this component's call to make unilaterally. If
 * leaflet-draw's nicer editing UX (drag-to-adjust vertices, snapping) is
 * wanted later, swap this imperative click-to-add implementation for it —
 * the onPolygonChange contract this component exposes doesn't need to
 * change either way.
 *
 * Known open question (see project coordination thread, 2026-09-07):
 * engine-system-economics' current SystemEconomicsInput has no `location`
 * (lat/lng) field, even though it needs one to call
 * getRadiationEstimate({lat, lng, tier, ...}) internally. Until that's
 * resolved, this component only hands up the raw polygon — a caller that
 * needs a single representative point can derive one (e.g. polygon
 * centroid via Turf.js) from what onPolygonChange already provides, so no
 * separate "location" output was invented here ahead of that decision.
 *
 * TODO(Owner A): optional NDVI shading cross-check via MODIS (NASA GIBS) —
 * not required for the accuracy target, not implemented here.
 *
 * UX pass (2026-09-07): CLAUDE.md's target users are "limited literacy,
 * low-end phones, developing regions" with a "minimize typing, maximize
 * taps" / icon-first principle. The first version of this component was a
 * plain-text, English-only, browser-default-button UI that didn't meet
 * that bar. This version: icon+short-label buttons at a >=44px touch
 * target, the first vertex visually distinguished (readers can see where
 * the outline will close instead of being told in a sentence), and an
 * icon-led status line instead of a full sentence. Still NOT i18n-wrapped
 * — CLAUDE.md assigns "wrap all user-facing strings" to Owner B's
 * QuestionFlow work; the short strings added here should get the same
 * treatment whenever that i18n setup lands, not be special-cased.
 */

const DEFAULT_CENTER: [number, number] = [37.5665, 126.978]; // Seoul — used only if geolocation is denied/unavailable
const DEFAULT_ZOOM = 19; // close enough to see individual roofs

export interface RoofMapProps {
  /**
   * Called with the current polygon every time it changes (each vertex
   * added, undone, or the whole thing reset to []). Always the raw
   * [lat, lng][] ring in the order the user clicked — not closed (no
   * repeated first point), not geodesically corrected. Fired live, not
   * just on confirm, so a parent can e.g. keep a "confirm" button disabled
   * until there are >= 3 points.
   */
  onPolygonChange?: (polygon: [number, number][]) => void;
}

export function RoofMap({ onPolygonChange }: RoofMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const vertexMarkersRef = useRef<L.CircleMarker[]>([]);

  const [points, setPoints] = useState<[number, number][]>([]);
  const [locating, setLocating] = useState(true);

  // Initialize the map once. Center on the user's current position when
  // available (falls back to DEFAULT_CENTER on denial/timeout/unsupported
  // browser) so most users don't have to pan/zoom to find their own roof.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 20,
    }).addTo(map);
    mapRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const next: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPoints((prev) => [...prev, next]);
    });

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const center: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          map.setView(center, DEFAULT_ZOOM);
          setLocating(false);
        },
        () => setLocating(false), // denied / unavailable — keep DEFAULT_CENTER
        { timeout: 8000 },
      );
    } else {
      setLocating(false);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw the in-progress polygon (fill) and per-vertex markers whenever
  // points changes, and notify the parent.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    for (const marker of vertexMarkersRef.current) map.removeLayer(marker);
    vertexMarkersRef.current = [];

    if (points.length > 0) {
      vertexMarkersRef.current = points.map((p, i) =>
        // First vertex marked distinctly (larger, filled solid) so the
        // user can see where the outline will close back to, rather than
        // being told in a sentence — closing an outline by "tapping back
        // on the first point" is a much more common map-drawing pattern
        // than reading instructions for it.
        i === 0
          ? L.circleMarker(p, { radius: 8, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1, weight: 3 }).addTo(map)
          : L.circleMarker(p, { radius: 5, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1 }).addTo(map),
      );
    }
    if (points.length >= 3) {
      polygonLayerRef.current = L.polygon(points, {
        color: '#2563eb',
        fillOpacity: 0.25,
      }).addTo(map);
    }

    onPolygonChange?.(points);
    // onPolygonChange is intentionally omitted from deps: it's expected to
    // be a fresh closure from the parent on every render (App.tsx passes
    // setRoofPolygon-derived callbacks), and including it would re-fire
    // this effect (and re-notify the parent) even when points hasn't
    // changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  function handleUndo() {
    setPoints((prev) => prev.slice(0, -1));
  }

  function handleReset() {
    setPoints([]);
  }

  const ready = points.length >= 3;

  return (
    <div className="roof-map">
      <div ref={containerRef} className="roof-map__map" />
      <div className="roof-map__controls">
        <button type="button" onClick={handleUndo} disabled={points.length === 0} aria-label="Undo last point">
          <span aria-hidden="true">↩️</span> Undo
        </button>
        <button type="button" onClick={handleReset} disabled={points.length === 0} aria-label="Reset outline">
          <span aria-hidden="true">🗑️</span> Reset
        </button>
      </div>
      <p className={`roof-map__status ${ready ? 'roof-map__status--ready' : ''}`}>
        {locating ? (
          <>
            <span aria-hidden="true">📍</span> Locating…
          </>
        ) : ready ? (
          <>
            <span aria-hidden="true">✅</span> Outline ready ({points.length} points)
          </>
        ) : points.length === 0 ? (
          <>
            <span aria-hidden="true">👆</span> Tap your roof's corners on the map
          </>
        ) : (
          <>
            <span aria-hidden="true">👆</span> {points.length} of 3+ points — keep tapping
          </>
        )}
      </p>
    </div>
  );
}

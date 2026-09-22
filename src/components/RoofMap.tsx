import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getRoofMapStatus } from './roofMapStatus';

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
 *
 * UX pass 2 (2026-09-08): two gaps left from the first pass.
 *  1. The module doc above says "draw/confirm a roof polygon", but there
 *     was no actual confirm step — the outline just silently became
 *     "ready" at 3+ points while still accepting unlimited more taps, with
 *     no way to tell the user "you're done, this is locked in". Added an
 *     explicit confirm/edit toggle: tapping "Confirm outline" locks the
 *     map (no more points accepted) and swaps the controls to
 *     "Edit outline" / "Start over"; tapping "Edit" reopens it.
 *     onPolygonChange's existing contract (fires live, on every points
 *     change) is unchanged by this — it's purely an added UI/lock state,
 *     not a new prop or a gate on the callback, so nothing downstream
 *     needs to change to pick it up.
 *  2. Geolocation denial/timeout silently fell back to the Seoul default
 *     center with zero explanation — a user not in Seoul would just see an
 *     unrelated city with no idea why. Now surfaced as a status line.
 *  Also disabled Leaflet's built-in doubleClickZoom: two roof corners
 *  tapped in quick succession near the same spot risked being read as a
 *  double-click (zooming the map) instead of two separate vertices — this
 *  is a click-to-add-points screen, not a click-to-zoom one, so that
 *  built-in behavior fights the one thing this screen is for.
 *
 * getRoofMapStatus (in ./roofMapStatus, kept pure/no Leaflet/DOM and in its
 * own module so eslint's react-refresh rule doesn't complain about a
 * component file exporting a non-component) is what this component's core
 * state logic reduces to for display purposes — see RoofMap.test.ts for its
 * unit coverage, which doesn't need to mount a live Leaflet map in jsdom
 * (heavy and flaky) to exercise.
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
  // The map's click handler is registered once, in the mount effect, so it
  // closes over this ref (not the `confirmed` state) to see later updates.
  const confirmedRef = useRef(false);

  const [points, setPoints] = useState<[number, number][]>([]);
  const [locating, setLocating] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Initialize the map once. Center on the user's current position when
  // available (falls back to DEFAULT_CENTER on denial/timeout/unsupported
  // browser) so most users don't have to pan/zoom to find their own roof.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      // A quick double-tap on two nearby roof corners should place two
      // points, not zoom the map — see "UX pass 2" doc note above.
      doubleClickZoom: false,
    }).setView(DEFAULT_CENTER, 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 20,
    }).addTo(map);
    mapRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (confirmedRef.current) return; // locked — see handleConfirm/handleEdit
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
        () => {
          setLocating(false);
          setLocationDenied(true); // denied / unavailable — keep DEFAULT_CENTER, but say so
        },
        { timeout: 8000 },
      );
    } else {
      setLocating(false);
      setLocationDenied(true);
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
    confirmedRef.current = false;
    setConfirmed(false);
  }

  function handleConfirm() {
    confirmedRef.current = true;
    setConfirmed(true);
  }

  function handleEdit() {
    confirmedRef.current = false;
    setConfirmed(false);
  }

  const ready = points.length >= 3;
  const status = getRoofMapStatus(points.length, locating, confirmed);

  return (
    <div className="roof-map">
      <div ref={containerRef} className="roof-map__map" />
      <div className="roof-map__controls">
        {confirmed ? (
          <>
            <button type="button" onClick={handleEdit} aria-label="Edit outline">
              <span aria-hidden="true">✏️</span> Edit
            </button>
            <button type="button" onClick={handleReset} aria-label="Start over">
              <span aria-hidden="true">🗑️</span> Start over
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={handleUndo} disabled={points.length === 0} aria-label="Undo last point">
              <span aria-hidden="true">↩️</span> Undo
            </button>
            <button type="button" onClick={handleReset} disabled={points.length === 0} aria-label="Reset outline">
              <span aria-hidden="true">🗑️</span> Reset
            </button>
            <button
              type="button"
              className="button--primary"
              onClick={handleConfirm}
              disabled={!ready}
              aria-label="Confirm outline"
            >
              <span aria-hidden="true">✅</span> Confirm outline
            </button>
          </>
        )}
      </div>
      <p className={`roof-map__status ${status === 'confirmed' ? 'roof-map__status--ready' : ''}`}>
        {status === 'locating' && (
          <>
            <span aria-hidden="true">📍</span> Locating…
          </>
        )}
        {status === 'confirmed' && (
          <>
            <span aria-hidden="true">🔒</span> Outline confirmed ({points.length} points)
          </>
        )}
        {status === 'ready' && (
          <>
            <span aria-hidden="true">✅</span> Outline ready ({points.length} points) — tap Confirm when done
          </>
        )}
        {status === 'empty' && (
          <>
            <span aria-hidden="true">👆</span> Tap your roof's corners on the map
          </>
        )}
        {status === 'in-progress' && (
          <>
            <span aria-hidden="true">👆</span> {points.length} of 3+ points — keep tapping
          </>
        )}
      </p>
      {locationDenied && status !== 'confirmed' && (
        <p className="roof-map__status">
          <span aria-hidden="true">ℹ️</span> Couldn't get your location, so the map starts centered on a default spot
          — pan/zoom to find your roof.
        </p>
      )}
    </div>
  );
}

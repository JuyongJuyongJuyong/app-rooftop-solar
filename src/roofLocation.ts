import pointOnFeature from '@turf/point-on-feature';
import { polygon } from '@turf/helpers';

/** On-roof representative point, not a physical roof plane or surveyed position.
 * Invalid/incomplete input returns null; Economics remains the polygon validator. */
export function deriveRoofLocation(roofPolygon: [number, number][]): { lat: number; lng: number } | null {
  if (roofPolygon.length < 3 || roofPolygon.some(([lat, lng]) => !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) return null;
  try {
    const ring: [number, number][] = roofPolygon.map(([lat, lng]) => [lng, lat]);
    const first = ring[0]!, last = ring[ring.length - 1]!;
    if (last[0] !== first[0] || last[1] !== first[1]) ring.push([...first]);
    if (new Set(ring.map(p => p.join(','))).size < 3) return null;
    const [lng, lat] = pointOnFeature(polygon([ring])).geometry.coordinates;
    if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

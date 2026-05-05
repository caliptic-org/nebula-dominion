import type { Vec2 } from './types';

/**
 * Voronoi cells via half-plane clipping (O(n^2)).
 *
 * For each seed: start with the bounding box polygon, then clip against
 * the perpendicular bisector with every other seed. This is the textbook
 * naive Voronoi — slow asymptotically but plenty fast for the n≤200
 * systems we'll show on the galaxy map. Output polygons are CCW-ish
 * arrays of points suitable for `<polygon points="...">`.
 */
export interface VoronoiCell {
  seedId: string;
  polygon: Vec2[];
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeVoronoi(
  seeds: { id: string; position: Vec2 }[],
  bounds: BoundingBox,
): VoronoiCell[] {
  const boxPoly: Vec2[] = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];

  return seeds.map((seed) => {
    let poly = boxPoly;
    for (const other of seeds) {
      if (other === seed) continue;
      poly = clipByBisector(poly, seed.position, other.position);
      if (poly.length === 0) break;
    }
    return { seedId: seed.id, polygon: poly };
  });
}

/**
 * Sutherland-Hodgman clip: keep points that are on `seed`'s side of the
 * perpendicular bisector between `seed` and `other`. The half-plane is
 * defined by normal n = (other - seed) and offset d = (|other|² - |seed|²)/2;
 * a point p is inside iff n·p < d.
 */
function clipByBisector(poly: Vec2[], seed: Vec2, other: Vec2): Vec2[] {
  if (poly.length === 0) return poly;
  const nx = other.x - seed.x;
  const ny = other.y - seed.y;
  // Bisector midpoint dot test: dot(p - mid, normal) < 0 means p is on seed side.
  const mx = (seed.x + other.x) / 2;
  const my = (seed.y + other.y) / 2;
  const inside = (p: Vec2) => (p.x - mx) * nx + (p.y - my) * ny < 0;

  const out: Vec2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const aIn = inside(a);
    const bIn = inside(b);
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      // Compute intersection of segment ab with the bisector
      const ax = a.x, ay = a.y;
      const dx = b.x - ax, dy = b.y - ay;
      const denom = dx * nx + dy * ny;
      if (denom !== 0) {
        const t = ((mx - ax) * nx + (my - ay) * ny) / denom;
        out.push({ x: ax + t * dx, y: ay + t * dy });
      }
    }
  }
  return out;
}

export function polygonToSvgPoints(poly: Vec2[]): string {
  return poly.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

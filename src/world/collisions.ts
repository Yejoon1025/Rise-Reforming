import type { Obstacle } from "./types";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function pointToAabbDistanceXZ(
  x: number,
  z: number,
  ob: Obstacle
): number {
  const [ox, , oz] = ob.position;
  const [sx, , sz] = ob.size;

  const halfX = sx / 2;
  const halfZ = sz / 2;

  const minX = ox - halfX;
  const maxX = ox + halfX;
  const minZ = oz - halfZ;
  const maxZ = oz + halfZ;

  const closestX = clamp(x, minX, maxX);
  const closestZ = clamp(z, minZ, maxZ);

  const dx = x - closestX;
  const dz = z - closestZ;

  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Returns nearest obstacle within `range` (distance is from point to the obstacle's XZ AABB).
 */
export function nearestObstacleWithinRangeXZ(
  x: number,
  z: number,
  obstacles: Obstacle[],
  range: number
): { near: boolean; nearId: string | null; distance: number | null } {
  let bestD = Infinity;
  let bestId: string | null = null;

  for (const ob of obstacles) {
    const d = pointToAabbDistanceXZ(x, z, ob);
    if (d < bestD) {
      bestD = d;
      bestId = ob.id;
    }
  }

  if (bestId !== null && bestD <= range) {
    return { near: true, nearId: bestId, distance: bestD };
  }
  return { near: false, nearId: null, distance: null };
}

/**
 * Resolve circle vs AABB collisions in XZ.
 * NEW: returns `collidedId` (the obstacle id with the deepest overlap this step).
 */
export function resolveCircleAABBsXZ(
  x: number,
  z: number,
  radius: number,
  obstacles: Obstacle[]
): { x: number; z: number; collided: boolean; collidedId: string | null } {
  let cx = x;
  let cz = z;

  let collided = false;
  let collidedId: string | null = null;

  // Track "strongest" collision
  let bestDepth = -Infinity;

  for (let iter = 0; iter < 2; iter++) {
    let anyThisIter = false;

    for (const ob of obstacles) {
      const [ox, , oz] = ob.position;
      const [sx, , sz] = ob.size;

      const halfX = sx / 2;
      const halfZ = sz / 2;

      const minX = ox - halfX;
      const maxX = ox + halfX;
      const minZ = oz - halfZ;
      const maxZ = oz + halfZ;

      const closestX = clamp(cx, minX, maxX);
      const closestZ = clamp(cz, minZ, maxZ);

      const dx = cx - closestX;
      const dz = cz - closestZ;
      const distSq = dx * dx + dz * dz;

      // Treat "touching" as collision to avoid flicker
      if (distSq <= radius * radius) {
        anyThisIter = true;
        collided = true;

        let depth: number;

        // Center inside rectangle: push out along shallowest axis
        if (dx === 0 && dz === 0) {
          const toMinX = cx - minX;
          const toMaxX = maxX - cx;
          const toMinZ = cz - minZ;
          const toMaxZ = maxZ - cz;

          const minPen = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
          depth = radius + minPen;

          if (minPen === toMinX) cx = minX - radius;
          else if (minPen === toMaxX) cx = maxX + radius;
          else if (minPen === toMinZ) cz = minZ - radius;
          else cz = maxZ + radius;
        } else {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          const penetration = radius - dist;

          depth = penetration;

          cx += nx * penetration;
          cz += nz * penetration;
        }

        if (depth > bestDepth) {
          bestDepth = depth;
          collidedId = ob.id;
        }
      }
    }

    if (!anyThisIter) break;
  }

  return { x: cx, z: cz, collided, collidedId: collided ? collidedId : null };
}

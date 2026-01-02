import * as THREE from "three";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import type { Obstacle } from "./types";

/**
 * Yield work so clone/instantiate happens across frames / idle time,
 * instead of spiking on one commit.
 */
function waitIdle(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as any;

    // Prefer idle time if available
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(() => resolve(), { timeout: 250 });
      return;
    }

    // Fallback: next frame
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Reveal list items gradually (e.g., one GLB url at a time).
 */
function useStaggeredRevealCount(total: number, intervalMs: number) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    setCount(0);

    if (total <= 0) return;

    // Always show at least 1 quickly (optional, but feels better)
    setCount(1);

    let i = 1;
    const tick = () => {
      if (!alive) return;
      if (i >= total) return;
      i += 1;
      setCount(i);
      if (i < total) setTimeout(tick, intervalMs);
    };

    if (total > 1) setTimeout(tick, intervalMs);

    return () => {
      alive = false;
    };
  }, [total, intervalMs]);

  return count;
}

/**
 * Clone/instantiate one obstacle at a time (spread CPU/VRAM work).
 */
function ObstacleInstance({
  obstacle,
  template,
  spawnDelayFrames = 0,
}: {
  obstacle: Obstacle;
  template: THREE.Object3D;
  spawnDelayFrames?: number;
}) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setObj(null);

    let rafId = 0;

    const run = async () => {
      // Optional: delay a few frames so even the instantiation is staggered
      for (let i = 0; i < spawnDelayFrames; i++) {
        await new Promise<void>((r) => {
          rafId = requestAnimationFrame(() => r());
        });
        if (cancelledRef.current) return;
      }

      await waitIdle();
      if (cancelledRef.current) return;

      const cloned = SkeletonUtils.clone(template) as THREE.Object3D;

      cloned.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          // Your Canvas has shadows off; keep GPU lean
          m.castShadow = false;
          m.receiveShadow = false;
          // A tiny bit of additional safety for perf:
          // m.frustumCulled = true; // default true; keep as-is unless debugging popping
        }
      });

      if (!cancelledRef.current) setObj(cloned);
    };

    run();

    return () => {
      cancelledRef.current = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [template, spawnDelayFrames]);

  if (!obj) return null;

  return (
    <primitive
      object={obj}
      position={obstacle.position}
      onPointerDown={(e) => e.stopPropagation()}
      dispose={null} // important when using cached GLTF resources
    />
  );
}

function ObstacleBatch({
  url,
  obstacles,
  perObstacleFrameStagger = 1,
}: {
  url: string;
  obstacles: Obstacle[];
  perObstacleFrameStagger?: number;
}) {
  // This load/parse happens only when this batch is mounted.
  const gltf = useGLTF(url);
  const template = useMemo(() => gltf.scene, [gltf.scene]);

  return (
    <>
      {obstacles.map((o, idx) => (
        <ObstacleInstance
          key={o.id}
          obstacle={o}
          template={template}
          // Stagger instantiation: obstacle i waits i * perObstacleFrameStagger frames
          spawnDelayFrames={idx * perObstacleFrameStagger}
        />
      ))}
    </>
  );
}

export function Obstacles({
  obstacles,
  urlLoadIntervalMs = 450,
  perObstacleFrameStagger = 1,
}: {
  obstacles: Obstacle[];
  /** Time between mounting each distinct GLB url batch (network/parse staggering) */
  urlLoadIntervalMs?: number;
  /** Frames between each obstacle clone within a batch (instantiate staggering) */
  perObstacleFrameStagger?: number;
}) {
  const defaultUrl = "testobs.glb";

  // Group by url so each GLB is loaded exactly once per url
  const grouped = useMemo(() => {
    const map = new Map<string, Obstacle[]>();
    for (const o of obstacles) {
      const url = o.url ?? defaultUrl;
      const arr = map.get(url);
      if (arr) arr.push(o);
      else map.set(url, [o]);
    }
    return Array.from(map.entries()); // [url, obstacleList][]
  }, [obstacles]);

  // Reveal GLB batches one at a time to avoid parse/VRAM spikes
  const visibleUrlCount = useStaggeredRevealCount(grouped.length, urlLoadIntervalMs);

  return (
    <>
      {grouped.slice(0, visibleUrlCount).map(([url, list]) => (
        <ObstacleBatch
          key={url}
          url={url}
          obstacles={list}
          perObstacleFrameStagger={perObstacleFrameStagger}
        />
      ))}
    </>
  );
}

/**
 * IMPORTANT:
 * Preloading everything defeats "load slowly".
 * If you want true staggering, keep these OFF.
 *
 * If later you want "warm up" a *single* next asset (not all), we can add a small
 * queued preloader instead of unconditional preload calls.
 */
// useGLTF.preload("Farm1.glb");
// useGLTF.preload("Chemical.glb");
// useGLTF.preload("Processing.glb");
// useGLTF.preload("Crane.glb");

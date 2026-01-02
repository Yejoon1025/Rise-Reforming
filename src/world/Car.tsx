import * as THREE from "three";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import type { Obstacle } from "./types";
import { nearestObstacleWithinRangeXZ, resolveCircleAABBsXZ } from "./collisions";

type KeyState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export function Car({
  target,
  clearTarget,
  obstacles,
  carRef,
  groundRef,
  onCollisionChange,
  hintDistance = 4,
}: {
  target: THREE.Vector3 | null;
  clearTarget: () => void;
  obstacles: Obstacle[];
  carRef?: React.MutableRefObject<THREE.Object3D | null>;
  groundRef?: React.MutableRefObject<THREE.Object3D | null>;
  onCollisionChange?: (active: boolean, obstacleId: string | null) => void;
  hintDistance?: number;
}) {
  const gltf = useGLTF("TankTruck.glb");
  const carObj = useMemo(
    () => SkeletonUtils.clone(gltf.scene) as THREE.Object3D,
    [gltf.scene]
  );

  const { camera } = useThree();
  const ref = useRef<THREE.Object3D | null>(null);

  const setRefs = useCallback(
    (node: THREE.Object3D | null) => {
      ref.current = node;
      if (carRef) carRef.current = node;
    },
    [carRef]
  );

  const keysRef = useRef<KeyState>({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const wasKeyDrivingRef = useRef(false);

  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const faceDir = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpCamFwd = useMemo(() => new THREE.Vector3(), []);
  const tmpCamRight = useMemo(() => new THREE.Vector3(), []);
  const tmpMatrix = useMemo(() => new THREE.Matrix4(), []);

  // --- Ground snap + tilt ---
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const down = useMemo(() => new THREE.Vector3(0, -1, 0), []);
  const tmpHitNormal = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const smoothedNormal = useRef(new THREE.Vector3(0, 1, 0));

  const carRadius = 0.65;
  const bumperBackoff = 0.12;

  const lastHintRef = useRef<{ active: boolean; id: string | null }>({
    active: false,
    id: null,
  });

  const emitHintIfChanged = useCallback(
    (active: boolean, id: string | null) => {
      const prev = lastHintRef.current;
      if (prev.active === active && prev.id === id) return;
      lastHintRef.current = { active, id };
      onCollisionChange?.(active, id);
    },
    [onCollisionChange]
  );

  // --- Void fall + respawn ---
  const fallRef = useRef<{ active: boolean; vy: number }>({ active: false, vy: 0 });

  // Tune these as needed:
  const GRAVITY = -28; // units/s^2
  const VOID_KILL_Y = -35; // respawn once car falls below this
  const RESPAWN_POS: [number, number, number] = [0, 18, 0]; // center spawn, above ground
  const CLEAR_ON_FALL = true; // clear click target when falling starts

  const doRespawn = useCallback(() => {
    const car = ref.current;
    if (!car) return;

    car.position.set(RESPAWN_POS[0], RESPAWN_POS[1], RESPAWN_POS[2]);
    car.quaternion.identity();

    // Reset “state”
    fallRef.current.active = false;
    fallRef.current.vy = 0;
    smoothedNormal.current.set(0, 1, 0);
    wasKeyDrivingRef.current = false;

    // Prevent lingering click-to-move
    clearTarget();

    // Reset hint state on respawn
    emitHintIfChanged(false, null);
  }, [clearTarget, emitHintIfChanged]);

  useEffect(() => {
    carObj.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = false;
        m.receiveShadow = false;
      }
    });
  }, [carObj]);

  useEffect(() => {
    const setKey = (e: KeyboardEvent, isDown: boolean) => {
      const k = keysRef.current;
      let handled = true;

      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          k.up = isDown;
          break;
        case "ArrowDown":
        case "KeyS":
          k.down = isDown;
          break;
        case "ArrowLeft":
        case "KeyA":
          k.left = isDown;
          break;
        case "ArrowRight":
        case "KeyD":
          k.right = isDown;
          break;
        default:
          handled = false;
      }

      if (handled) e.preventDefault();
    };

    // NOTE: keep same pattern you already had (even though removeEventListener won't match)
    window.addEventListener("keydown", (e) => setKey(e, true), { passive: false });
    window.addEventListener("keyup", (e) => setKey(e, false), { passive: false });

    return () => {
      window.removeEventListener("keydown", (e) => setKey(e, true));
      window.removeEventListener("keyup", (e) => setKey(e, false));
    };
  }, []);

  useFrame((_, delta) => {
    const car = ref.current;
    if (!car) return;

    // If we are falling, apply gravity and ignore movement.
    if (fallRef.current.active) {
      fallRef.current.vy += GRAVITY * delta;
      car.position.y += fallRef.current.vy * delta;

      if (car.position.y < VOID_KILL_Y) {
        doRespawn();
      }

      // While falling, do not emit “near obstacle” hints
      emitHintIfChanged(false, null);
      return;
    }

    const speed = 6;
    let didMove = false;
    let collided = false;
    let collidedId: string | null = null;

    faceDir.set(0, 0, 0);

    const k = keysRef.current;
    const forward = (k.up ? 1 : 0) + (k.down ? -1 : 0);
    const strafe = (k.right ? 1 : 0) + (k.left ? -1 : 0);

    // --- Keyboard driving ---
    if (forward !== 0 || strafe !== 0) {
      if (target && !wasKeyDrivingRef.current) clearTarget();
      wasKeyDrivingRef.current = true;

      camera.getWorldDirection(tmpCamFwd);
      tmpCamFwd.y = 0;
      if (tmpCamFwd.lengthSq() < 1e-6) tmpCamFwd.set(0, 0, -1);
      tmpCamFwd.normalize();

      tmpCamRight.crossVectors(tmpCamFwd, up).normalize();

      faceDir
        .addScaledVector(tmpCamFwd, forward)
        .addScaledVector(tmpCamRight, strafe);

      if (faceDir.lengthSq() > 1e-8) {
        faceDir.normalize();
        const step = speed * delta;

        const nextX = car.position.x + faceDir.x * step;
        const nextZ = car.position.z + faceDir.z * step;

        const resolved = resolveCircleAABBsXZ(nextX, nextZ, carRadius, obstacles);
        car.position.x = resolved.x;
        car.position.z = resolved.z;

        if (resolved.collided) {
          car.position.x -= faceDir.x * bumperBackoff;
          car.position.z -= faceDir.z * bumperBackoff;
        }

        collided = resolved.collided;
        collidedId = resolved.collidedId;
        didMove = true;
      }
    } else {
      wasKeyDrivingRef.current = false;
    }

    // --- Click-to-move ---
    if (!didMove && target) {
      faceDir.set(target.x - car.position.x, 0, target.z - car.position.z);
      const dist = faceDir.length();

      if (dist < 0.1) {
        clearTarget();
      } else {
        faceDir.normalize();
        const step = Math.min(speed * delta, dist);

        const nextX = car.position.x + faceDir.x * step;
        const nextZ = car.position.z + faceDir.z * step;

        const resolved = resolveCircleAABBsXZ(nextX, nextZ, carRadius, obstacles);
        car.position.x = resolved.x;
        car.position.z = resolved.z;

        if (resolved.collided) {
          car.position.x -= faceDir.x * bumperBackoff;
          car.position.z -= faceDir.z * bumperBackoff;
          clearTarget();
        }

        collided = resolved.collided;
        collidedId = resolved.collidedId;
        didMove = true;
      }
    }

    // --- Snap Y + terrain normal OR start falling if no ground below ---
    const ground = groundRef?.current;
    if (ground) {
      raycaster.set(
        new THREE.Vector3(car.position.x, car.position.y + 20, car.position.z),
        down
      );
      const hits = raycaster.intersectObject(ground, true);

      if (hits.length > 0) {
        const hit = hits[0];
        car.position.y = hit.point.y;

        if (hit.face) {
          tmpHitNormal
            .copy(hit.face.normal)
            .transformDirection(hit.object.matrixWorld)
            .normalize();
        } else {
          tmpHitNormal.set(0, 1, 0);
        }

        smoothedNormal.current
          .lerp(tmpHitNormal, 1 - Math.pow(0.001, delta))
          .normalize();
      } else {
        // No ground under us => fall into void
        fallRef.current.active = true;
        fallRef.current.vy = 0;

        if (CLEAR_ON_FALL) clearTarget();

        // Optional: preserve last rotation; we simply start dropping next frame.
        emitHintIfChanged(false, null);
        return;
      }
    }

    // --- Rotation: face direction of travel, tilt via terrain normal ---
    if (didMove && faceDir.lengthSq() > 1e-8) {
      const n = smoothedNormal.current;

      const forwardOnPlane = faceDir.clone().projectOnPlane(n).normalize();
      tmpLook.set(
        car.position.x + forwardOnPlane.x,
        car.position.y + forwardOnPlane.y,
        car.position.z + forwardOnPlane.z
      );

      tmpMatrix.lookAt(car.position, tmpLook, n);
      tmpQuat.setFromRotationMatrix(tmpMatrix);

      car.quaternion.slerp(tmpQuat, 1 - Math.pow(0.001, delta));
    }

    const near = nearestObstacleWithinRangeXZ(
      car.position.x,
      car.position.z,
      obstacles,
      hintDistance
    );

    emitHintIfChanged(collided || near.near, collided ? collidedId : near.nearId);
  });

  return <primitive ref={setRefs} object={carObj} dispose={null} position={[0, 0, 0]} />;
}

useGLTF.preload("TankTruck.glb");

import * as THREE from "three";
import React, { Suspense, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Obstacle } from "./types";
import { Ground } from "./Ground";
import { Obstacles } from "./Obstacles";
import { TargetMarker } from "./TargetMarker";
import { Car } from "./Car";

/* ---------------- Fallbacks ---------------- */

function GroundFallback() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial />
    </mesh>
  );
}

function CarFallback() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[1.2, 0.8, 2.2]} />
      <meshStandardMaterial />
    </mesh>
  );
}

/* ---------------- Guidance Arrow ---------------- */

function GuidanceIndicator({
  carRef,
  target,
  height = 2.0,
}: {
  carRef: React.MutableRefObject<THREE.Object3D | null>;
  target: THREE.Vector3 | null;
  height?: number;
}) {
  const gRef = useRef<THREE.Group | null>(null);
  const dir = useRef(new THREE.Vector3());
  const tmpTarget = useRef(new THREE.Vector3());

  useFrame((state) => {
    const g = gRef.current;
    const car = carRef.current;

    if (!g || !car || !target) {
      if (g) g.visible = false;
      return;
    }

    g.visible = true;
    g.position.copy(car.position);

    const bob = 0.14 * Math.sin(state.clock.elapsedTime * 2.4);
    g.position.y += height + bob;

    tmpTarget.current.copy(target);
    dir.current.copy(tmpTarget.current).sub(car.position);
    dir.current.y = 0;

    if (dir.current.lengthSq() < 0.25) {
      g.visible = false;
      return;
    }

    dir.current.normalize();
    const yaw = Math.atan2(dir.current.x, dir.current.z);
    g.rotation.set(0, yaw, 0);
  });

  return (
    <group ref={gRef}>
      <mesh position={[-0.18, 0, 0]} rotation={[0, Math.PI / 8, Math.PI / 6]}>
        <boxGeometry args={[0.08, 0.08, 0.9]} />
        <meshStandardMaterial
          color="#ffd56a"
          emissive="#ffcc55"
          emissiveIntensity={0.9}
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>

      <mesh position={[0.18, 0, 0]} rotation={[0, -Math.PI / 8, -Math.PI / 6]}>
        <boxGeometry args={[0.08, 0.08, 0.9]} />
        <meshStandardMaterial
          color="#ffd56a"
          emissive="#ffcc55"
          emissiveIntensity={0.9}
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

/* ---------------- Car Ambient Bubble ---------------- */

function CarLightBubble({
  carRef,
}: {
  carRef: React.MutableRefObject<THREE.Object3D | null>;
}) {
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame(() => {
    const g = groupRef.current;
    const car = carRef.current;
    if (!g || !car) return;
    g.position.copy(car.position);
  });

  return (
    <group ref={groupRef}>
      <pointLight
        position={[0, 2.6, 0]}
        intensity={1.6}
        distance={14}
        decay={2}
        color="#6fdce6"
      />
      <pointLight
        position={[0, 1.2, 0]}
        intensity={1.1}
        distance={18}
        decay={2}
        color="#3fc6d4"
      />
    </group>
  );
}

/* ---------------- Car Ground Pool Spotlight (Circle) ---------------- */

function CarGroundPoolLight({
  carRef,
  height = 10,          // higher = larger, softer pool (up to distance/angle)
  radiusBias = 1.0,     // tweak pool size a bit without changing height
}: {
  carRef: React.MutableRefObject<THREE.Object3D | null>;
  height?: number;
  radiusBias?: number;
}) {
  const lightRef = useRef<THREE.SpotLight | null>(null);
  const targetRef = useRef<THREE.Object3D | null>(null);

  useFrame(() => {
    const car = carRef.current;
    const light = lightRef.current;
    const target = targetRef.current;
    if (!car || !light || !target) return;

    // Put the light above the car
    light.position.set(car.position.x, car.position.y + height, car.position.z);

    // Aim at the ground right under the car to form a circular pool
    target.position.set(car.position.x-1.5, 0, car.position.z-1.5);

    // Ensure the spotlight direction updates correctly
    light.target.updateMatrixWorld();
  });

  return (
    <>
      <object3D ref={targetRef} />
      <spotLight
        ref={lightRef}
        target={targetRef.current ?? undefined}
        // Higher intensity since you're running a dark world
        intensity={1.5}
        // Distance should be >= height; larger distance allows more reach
        distance={Math.max(22, height * 2.2)}
        // Wide cone -> bigger circle footprint
        angle={Math.min(Math.PI / 2.2, (Math.PI / 3) * radiusBias)}
        // Higher penumbra -> softer edge circle
        penumbra={0.9}
        // Physically-correct falloff
        decay={0}
        color="#6fdce6"
      />
    </>
  );
}

/* ---------------- Obstacle Contact Spotlight ---------------- */

function ObstacleContactLight({
  obstacle,
  active,
}: {
  obstacle: Obstacle | null;
  active: boolean;
}) {
  const lightRef = useRef<THREE.SpotLight | null>(null);
  const targetRef = useRef<THREE.Object3D | null>(null);

  useFrame(() => {
    if (!lightRef.current || !targetRef.current || !obstacle || !active) return;

    lightRef.current.position.set(
      obstacle.position[0]+5,
      obstacle.position[1] + obstacle.size[1] + 6,
      obstacle.position[2] + 5
    );

    targetRef.current.position.set(
      obstacle.position[0],
      obstacle.position[1],
      obstacle.position[2]
    );
  });

  if (!obstacle || !active) return null;

  return (
    <>
      <object3D ref={targetRef} />
      <spotLight
        ref={lightRef}
        target={targetRef.current ?? undefined}
        intensity={3.2}
        distance={20}
        angle={Math.PI / 5}
        penumbra={0.6}
        decay={0}
        color="#dcfcffff"
      />
    </>
  );
}

/* ====================== WORLD SCENE ====================== */

export function WorldScene({
  onCollisionChange,
  nextObstacleId,
}: {
  onCollisionChange?: (active: boolean, obstacleId: string | null) => void;
  nextObstacleId?: string | null;
}) {
  const [target, setTarget] = useState<THREE.Vector3 | null>(null);
  const [collisionActive, setCollisionActive] = useState(false);
  const [activeObstacleId, setActiveObstacleId] = useState<string | null>(null);

  const obstacles: Obstacle[] = useMemo(
    () => [
      { id: "b1", position: [-20, 1.5, 20], size: [8, 8.0, 8.2], url: "Barn.glb" },
      {
        id: "b2",
        position: [-20, 1.5, -20],
        size: [6.0, 6.0, 6.0],
        url: "ProcessingPlant.glb",
      },
      {
        id: "b3",
        position: [20, 1.5, -20],
        size: [8.0, 8.0, 5.5],
        url: "ChemicalPlant.glb",
      },
      { id: "b4", position: [20, 1.5, 20], size: [4.5, 3.0, 5.5], url: "CarCrane.glb" },
    ],
    []
  );

  const carRef = useRef<THREE.Object3D | null>(null);
  const groundRef = useRef<THREE.Object3D | null>(null);
  const controlsRef = useRef<any>(null);

  const prevCarPos = useRef(new THREE.Vector3());
  const hasPrev = useRef(false);
  const delta = useRef(new THREE.Vector3());

  const { camera } = useThree();

  useFrame(() => {
    const car = carRef.current;
    const controls = controlsRef.current;
    if (!car || !controls) return;

    if (!hasPrev.current) {
      prevCarPos.current.copy(car.position);
      controls.target.copy(car.position);
      controls.update();
      hasPrev.current = true;
      return;
    }

    delta.current.copy(car.position).sub(prevCarPos.current);
    camera.position.add(delta.current);
    controls.target.copy(car.position);

    prevCarPos.current.copy(car.position);
    controls.update();
  });

  const nextTarget = useMemo(() => {
    if (!nextObstacleId) return null;
    const o = obstacles.find((x) => x.id === nextObstacleId);
    if (!o) return null;
    return new THREE.Vector3(o.position[0], o.position[1], o.position[2]);
  }, [nextObstacleId, obstacles]);

  const activeObstacle = collisionActive
    ? obstacles.find((o) => o.id === activeObstacleId) ?? null
    : null;

  return (
    <>
      <ambientLight intensity={0.09} />
      <directionalLight position={[-40, 60, -30]} intensity={0.2} color="#cfd8ff" />
      <directionalLight position={[50, 80, 40]} intensity={0.2} color="#e6ecff" />

      <Suspense fallback={<GroundFallback />}>
        <Ground onSetTarget={setTarget} groundRef={groundRef} />
      </Suspense>

      <TargetMarker target={target} />

      <Suspense fallback={null}>
        <Obstacles obstacles={obstacles} urlLoadIntervalMs={450} perObstacleFrameStagger={1} />
      </Suspense>

      <ObstacleContactLight obstacle={activeObstacle} active={collisionActive} />

      <Suspense fallback={<CarFallback />}>
        <Car
          target={target}
          clearTarget={() => setTarget(null)}
          obstacles={obstacles}
          carRef={carRef}
          groundRef={groundRef}
          hintDistance={4}
          onCollisionChange={(active, id) => {
            setCollisionActive(active);
            setActiveObstacleId(active ? id : null);
            onCollisionChange?.(active, id);
          }}
        />
        <CarLightBubble carRef={carRef} />
        <CarGroundPoolLight carRef={carRef} height={10} radiusBias={1.0} />
      </Suspense>

      <GuidanceIndicator carRef={carRef} target={nextTarget} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableRotate={false}
        enableZoom={true}
        minPolarAngle={0.6}
        maxPolarAngle={1.25}
      />
    </>
  );
}

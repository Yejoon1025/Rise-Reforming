import * as THREE from "three";
import React from "react";

export function TargetMarker({ target }: { target: THREE.Vector3 | null }) {
  if (!target) return null;

  return (
    <mesh position={[target.x, 0.25, target.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.25, 0.35, 32]} />
      <meshBasicMaterial color="#111" transparent opacity={0.6} />
    </mesh>
  );
}

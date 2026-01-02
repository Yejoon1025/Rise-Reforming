import * as THREE from "three";
import React, { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

export function Ground({
  onSetTarget,
  groundRef,
}: {
  onSetTarget: (p: THREE.Vector3) => void;
  groundRef?: React.MutableRefObject<THREE.Object3D | null>;
}) {
  const gltf = useGLTF("FinalTerrain.glb");

  // IMPORTANT: clone the cached gltf.scene so R3F disposal/mutations never touch the cache
  const scene = useMemo(() => SkeletonUtils.clone(gltf.scene) as THREE.Object3D, [gltf.scene]);

  useEffect(() => {
    if (groundRef) groundRef.current = scene;

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.receiveShadow = false; // Canvas shadows are off; keep GPU lean
        m.userData.isGround = true; // tag for raycast filtering (optional)
      }
    });

    return () => {
      if (groundRef && groundRef.current === scene) groundRef.current = null;
    };
  }, [scene, groundRef]);

  return (
    <primitive
      object={scene}
      dispose={null}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSetTarget(e.point.clone());
      }}
    />
  );
}

useGLTF.preload("FinalTerrain.glb");

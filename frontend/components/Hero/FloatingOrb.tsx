"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

/**
 * A single premium glowing orb. Floats slowly, lerps toward the cursor at a
 * fraction of its travel, and stays subtle — this is ambient light, not a
 * focal illustration. Intended as a child of Hero/HeroBackground's Canvas.
 */
const BASE_POSITION: [number, number, number] = [2.6, -1.6, -5];

export function FloatingOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    const { pointer, clock } = state;
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
      meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.12) * 0.12;
    }
    if (groupRef.current) {
      // İmleç etkisi, viewport ölçeğinin %10'unun oldukça altında sınırlandırılır, temel ofsetin üzerine uygulanır.
      const targetX = BASE_POSITION[0] + (pointer.x * viewport.width) / 24;
      const targetY = BASE_POSITION[1] + (pointer.y * viewport.height) / 24;
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.03);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.03);
    }
  });

  return (
    <group ref={groupRef} position={BASE_POSITION}>
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={1}>
        <mesh ref={meshRef} scale={0.85}>
          <icosahedronGeometry args={[1, 12]} />
          <MeshDistortMaterial
            color="#a78bfa"
            emissive="#7c3aed"
            emissiveIntensity={0.25}
            roughness={0.25}
            metalness={0.2}
            distort={0.3}
            speed={1.4}
            transparent
            opacity={0.3}
          />
        </mesh>
      </Float>
    </group>
  );
}
